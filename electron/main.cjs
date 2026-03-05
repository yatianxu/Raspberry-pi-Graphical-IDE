/**
 * Electron Main Process — Raspberry Pi IDE
 * Handles SSH upload, run, kill, device discovery, and file dialogs.
 */
"use strict";

const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const dgram = require("node:dgram");
const { execSync } = require("node:child_process");
const { Client } = require("ssh2");

// ───────────────────────────────────────────────────────────
// Window
// ───────────────────────────────────────────────────────────

// Dev mode: not packaged (running via `electron .` or `concurrently`)
// Prod mode: packaged via electron-builder
const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:5173";

// Resolve icon path — may not exist during first dev run before vite build
const iconPath = path.join(__dirname, "..", "dist", "images", "icon.ico");

function createMainWindow() {
  const winOptions = {
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Raspberry Pi IDE",
    autoHideMenuBar: true,
    backgroundColor: "#0d1117",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  };

  // Only set icon if the file actually exists (not yet built in first dev run)
  if (fs.existsSync(iconPath)) {
    winOptions.icon = iconPath;
  }

  const win = new BrowserWindow(winOptions);

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    try { shell.openExternal(url); } catch { /* ignore */ }
    return { action: "deny" };
  });

  if (isDev) {
    // Load from Vite dev server (hot-reload)
    win.loadURL(DEV_SERVER_URL).catch(() => {
      // Vite not ready yet — show a helpful message
      win.loadURL(`data:text/html,<body style="background:#0d1117;color:#3abe85;font-family:monospace;padding:40px">
        <h2>⏳ 等待 Vite 开发服务器...</h2>
        <p>请先运行 <code>npm run vite</code>，然后再启动 Electron。</p>
        <p>或使用 <code>npm run dev</code> 同时启动两者。</p>
        <script>setTimeout(()=>location.reload(),2000)</script>
      </body>`);
    });
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

// ───────────────────────────────────────────────────────────
// Network helpers
// ───────────────────────────────────────────────────────────

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function intToIpv4(num) {
  return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".");
}

function netmaskToPrefix(mask) {
  const val = ipv4ToInt(mask);
  let bits = 0;
  for (let i = 31; i >= 0; i--) { if (val & (1 << i)) bits++; }
  return bits;
}

function getBroadcastAddrs() {
  const interfaces = os.networkInterfaces();
  const addrs = new Set();
  for (const infos of Object.values(interfaces)) {
    for (const info of (infos || [])) {
      if (info.family !== "IPv4" || info.internal || !info.address || !info.netmask) continue;
      const ip = ipv4ToInt(info.address);
      const mask = ipv4ToInt(info.netmask);
      addrs.add(intToIpv4((ip & mask) | (~mask >>> 0)));
    }
  }
  if (addrs.size === 0) addrs.add("255.255.255.255");
  return Array.from(addrs);
}

// ───────────────────────────────────────────────────────────
// IPC: UDP device discovery
// ───────────────────────────────────────────────────────────

ipcMain.handle("udp-discovery", async (_event, { timeoutMs = 2000 } = {}) => {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const devices = new Map();
    const DISCOVERY_PORT = 45899;
    const DISCOVERY_MAGIC = "ROBEX_DISCOVERY";

    socket.on("message", (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString("utf-8"));
        if (!payload || payload.type !== "robex_discovery") return;
        const device = {
          name: payload.name || "tree-pi",
          port: payload.port || 22,
          ip: rinfo.address,
          id: payload.id || "",
        };
        devices.set(`${device.ip}:${device.port}`, device);
      } catch { /* ignore */ }
    });

    socket.on("error", () => { /* ignore */ });
    socket.bind(0, () => {
      try { socket.setBroadcast(true); } catch { /* ignore */ }
      for (const addr of getBroadcastAddrs()) {
        socket.send(DISCOVERY_MAGIC, DISCOVERY_PORT, addr);
      }
    });

    setTimeout(() => {
      try { socket.close(); } catch { /* ignore */ }
      // Sort: prefer 192.168.x.x then 10.x.x.x
      const list = Array.from(devices.values()).sort((a, b) => {
        const aP = a.ip.startsWith("192") ? 0 : a.ip.startsWith("10") ? 1 : 2;
        const bP = b.ip.startsWith("192") ? 0 : b.ip.startsWith("10") ? 1 : 2;
        return aP - bP || ipv4ToInt(a.ip) - ipv4ToInt(b.ip);
      });
      resolve(list);
    }, timeoutMs);
  });
});

// ───────────────────────────────────────────────────────────
// SSH helpers
// ───────────────────────────────────────────────────────────

/**
 * Create and connect an SSH client.
 * @returns {Promise<Client>}
 */
function connectSSH({ ip, username, password, port = 22, timeout = 8000 }) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", (err) => reject(new Error(`SSH 连接失败: ${err.message}`)))
      .connect({ host: ip, port, username, password, readyTimeout: timeout });
  });
}

/**
 * Execute a command over SSH and collect stdout/stderr.
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function execSSH(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) { reject(new Error(err.message)); return; }
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => resolve({ code, stdout, stderr }))
        .on("data", (d) => { stdout += d.toString(); })
        .stderr.on("data", (d) => { stderr += d.toString(); });
    });
  });
}

// ───────────────────────────────────────────────────────────
// IPC: Upload Python script via SFTP
// ───────────────────────────────────────────────────────────

ipcMain.handle("ssh-upload-script", async (event, { ip, username, password, filename, code, progressChannel }) => {
  const sendProgress = (data) => {
    if (progressChannel) event.sender.send(progressChannel, data);
  };

  try {
    sendProgress({ status: "connecting", message: `正在连接 ${ip}...` });
    const conn = await connectSSH({ ip, username, password });

    // Ensure target directory exists
    const remoteDir = `/home/${username}/rpi_ide_scripts`;
    const remotePath = `${remoteDir}/${filename}`;
    await execSSH(conn, `mkdir -p ${remoteDir}`);

    sendProgress({ status: "uploading", message: `上传 ${filename}...` });

    // Upload via SFTP
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) { reject(new Error(`SFTP 错误: ${err.message}`)); return; }
        const buf = Buffer.from(code, "utf-8");
        const ws = sftp.createWriteStream(remotePath);
        ws.on("close", () => resolve());
        ws.on("error", reject);
        ws.end(buf);
      });
    });

    sendProgress({ status: "done", message: `✓ "${filename}" 已上传到 ${remotePath}` });
    conn.end();
    return { success: true, remotePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ───────────────────────────────────────────────────────────
// IPC: Run script via SSH, stream stdout/stderr back
// ───────────────────────────────────────────────────────────

// Track active SSH connections for kill
const activeRunConnections = new Map();

ipcMain.handle("ssh-run-script", async (event, { ip, username, password, filename, progressChannel }) => {
  const send = (data) => {
    if (progressChannel) event.sender.send(progressChannel, data);
  };

  try {
    const conn = await connectSSH({ ip, username, password });
    activeRunConnections.set(ip, conn);

    const scriptPath = `/home/${username}/rpi_ide_scripts/${filename}`;
    send({ type: "info", text: `▶  python3 ${scriptPath}\n` });

    conn.exec(`python3 -u ${scriptPath}`, (err, stream) => {
      if (err) {
        send({ type: "stderr", text: `执行错误: ${err.message}\n` });
        send({ type: "exit", code: 1 });
        conn.end();
        activeRunConnections.delete(ip);
        return;
      }
      stream
        .on("close", (code) => {
          send({ type: "exit", code });
          conn.end();
          activeRunConnections.delete(ip);
        })
        .on("data", (data) => send({ type: "stdout", text: data.toString() }))
        .stderr.on("data", (data) => send({ type: "stderr", text: data.toString() }));
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ───────────────────────────────────────────────────────────
// IPC: Kill running script
// ───────────────────────────────────────────────────────────

ipcMain.handle("ssh-kill-script", async (_event, { ip, username, password, filename }) => {
  // Try via open connection first
  const conn = activeRunConnections.get(ip);
  if (conn) {
    try { conn.end(); } catch { /* ignore */ }
    activeRunConnections.delete(ip);
  }

  // Kill the python3 process on the Pi
  try {
    const killConn = await connectSSH({ ip, username, password });
    await execSSH(killConn, `pkill -f "${filename}" || true`);
    killConn.end();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ───────────────────────────────────────────────────────────
// IPC: Legacy .whl SSH update (kept for compatibility)
// ───────────────────────────────────────────────────────────

ipcMain.handle("select-whl-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Wheel Files", extensions: ["whl"] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ───────────────────────────────────────────────────────────
// App lifecycle
// ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
