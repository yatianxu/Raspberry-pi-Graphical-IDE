/**
 * Electron Main Process — Raspberry Pi IDE
 * Handles SSH upload, run, kill, device discovery, and file dialogs.
 */
"use strict";

const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const net = require("node:net");
const { Client } = require("ssh2");

const activeShellSessions = new Map();

function getRemoteScriptPath(username) {
  return `/home/${username}/carbot/main.py`;
}

function getRemoteScriptDir(username) {
  return path.posix.dirname(getRemoteScriptPath(username));
}

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

function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];
  for (const [name, infos] of Object.entries(interfaces)) {
    for (const info of (infos || [])) {
      if (info.family !== "IPv4" || info.internal || !info.address || !info.netmask) continue;
      const ip = ipv4ToInt(info.address);
      const mask = ipv4ToInt(info.netmask);
      const prefix = netmaskToPrefix(info.netmask);
      // Keep discovery bounded to at most a /24 to avoid scanning huge LANs.
      const effectivePrefix = Math.max(prefix, 24);
      const effectiveMask = effectivePrefix === 32
        ? 0xffffffff
        : (0xffffffff << (32 - effectivePrefix)) >>> 0;
      const network = ip & effectiveMask;
      const broadcast = network | (~effectiveMask >>> 0);
      subnets.push({
        name,
        address: info.address,
        netmask: info.netmask,
        prefix: effectivePrefix,
        network,
        broadcast,
        cidr: `${intToIpv4(network)}/${effectivePrefix}`,
      });
    }
  }
  return subnets;
}

function sortDevices(a, b) {
  const aP = a.ip.startsWith("192") ? 0 : a.ip.startsWith("10") ? 1 : 2;
  const bP = b.ip.startsWith("192") ? 0 : b.ip.startsWith("10") ? 1 : 2;
  return aP - bP || ipv4ToInt(a.ip) - ipv4ToInt(b.ip);
}

function probeTcpPort(host, port, timeout = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function mapWithConcurrency(items, limit, iterator) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await iterator(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
  return results;
}

function buildDiscoveryTargets() {
  const targets = [];
  const seen = new Set();

  for (const subnet of getLocalSubnets()) {
    for (let current = subnet.network + 1; current < subnet.broadcast; current += 1) {
      const ip = intToIpv4(current >>> 0);
      if (ip === subnet.address || seen.has(ip)) continue;
      seen.add(ip);
      targets.push(ip);
    }
  }

  return targets.sort((a, b) => sortDevices({ ip: a }, { ip: b }));
}

function normalizeDiscoveryError(error) {
  const message = String(error?.message || error || "");
  if (/all configured authentication methods failed/i.test(message)) {
    return "用户名或密码错误";
  }
  if (/timed out/i.test(message)) {
    return "SSH 登录超时";
  }
  if (/host is not reachable/i.test(message)) {
    return "主机不可达";
  }
  return message || "SSH 登录失败";
}

// ───────────────────────────────────────────────────────────
// IPC: SSH device discovery
// ───────────────────────────────────────────────────────────

ipcMain.handle("ssh-discovery", async (_event, {
  username,
  password,
  timeoutMs = 6000,
  port = 22,
} = {}) => {
  if (!username || !password) {
    throw new Error("自动发现需要提供 SSH 用户名和密码");
  }

  const startedAt = Date.now();
  const subnets = getLocalSubnets();
  const targets = buildDiscoveryTargets();
  let sshOpenCount = 0;
  const devices = await mapWithConcurrency(targets, 32, async (ip) => {
    if (Date.now() - startedAt > timeoutMs) return null;

    const portOpen = await probeTcpPort(ip, port, 350);
    if (!portOpen) return null;
    sshOpenCount += 1;

    const device = {
      name: "ssh-device",
      port,
      ip,
      sshOpen: true,
      loginOk: false,
      error: "",
    };

    try {
      const conn = await connectSSH({ ip, username, password, port, timeout: 2500 });
      let hostname = "raspberry-pi";
      try {
        const { stdout } = await execSSH(conn, "hostname");
        if (stdout.trim()) hostname = stdout.trim();
      } catch { /* ignore */ }
      conn.end();
      device.name = hostname;
      device.loginOk = true;
      return device;
    } catch (error) {
      device.error = normalizeDiscoveryError(error);
      return device;
    }
  });

  return {
    scanned: targets.length,
    sshOpenCount,
    subnets: subnets.map((subnet) => ({
      name: subnet.name,
      address: subnet.address,
      cidr: subnet.cidr,
    })),
    devices: devices.filter(Boolean).sort(sortDevices),
  };
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

ipcMain.handle("ssh-upload-script", async (event, { ip, username, password, code, progressChannel }) => {
  const sendProgress = (data) => {
    if (progressChannel) event.sender.send(progressChannel, data);
  };
  const remoteScriptPath = getRemoteScriptPath(username);
  const remoteScriptDir = getRemoteScriptDir(username);

  try {
    sendProgress({ status: "connecting", message: `正在连接 ${ip}...` });
    const conn = await connectSSH({ ip, username, password });
    sendProgress({ status: "connected", message: `SSH 已连接，目标路径 ${remoteScriptPath}` });

    // Ensure target directory exists
    await execSSH(conn, `mkdir -p ${remoteScriptDir}`);
    sendProgress({ status: "preparing", message: `已确认远端目录 ${remoteScriptDir}` });

    sendProgress({ status: "uploading", message: `上传脚本到 ${remoteScriptPath}...` });

    // Upload via SFTP
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) { reject(new Error(`SFTP 错误: ${err.message}`)); return; }
        const buf = Buffer.from(code, "utf-8");
        const ws = sftp.createWriteStream(remoteScriptPath);
        ws.on("close", () => resolve());
        ws.on("error", reject);
        ws.end(buf);
      });
    });

    sendProgress({ status: "done", message: `✓ main.py 已上传到 ${remoteScriptPath}` });
    conn.end();
    return { success: true, remotePath: remoteScriptPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ───────────────────────────────────────────────────────────
// IPC: Run script via SSH, stream stdout/stderr back
// ───────────────────────────────────────────────────────────

// Track active SSH connections for kill
const activeRunConnections = new Map();

ipcMain.handle("ssh-run-script", async (event, { ip, username, password, progressChannel }) => {
  const send = (data) => {
    if (progressChannel) event.sender.send(progressChannel, data);
  };
  const remoteScriptPath = getRemoteScriptPath(username);

  try {
    const conn = await connectSSH({ ip, username, password });
    activeRunConnections.set(ip, conn);

    send({ type: "info", text: `SSH 已连接: ${username}@${ip}\n` });
    send({ type: "info", text: `▶  python3 ${remoteScriptPath}\n` });

    conn.exec(`python3 -u ${remoteScriptPath}`, (err, stream) => {
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
// IPC: Interactive SSH shell
// ───────────────────────────────────────────────────────────

ipcMain.handle("ssh-shell-open", async (event, {
  sessionId,
  ip,
  username,
  password,
  progressChannel,
  cols = 120,
  rows = 30,
} = {}) => {
  const send = (data) => {
    if (progressChannel) event.sender.send(progressChannel, data);
  };

  if (!sessionId) {
    return { success: false, error: "缺少终端会话 ID" };
  }

  const existing = activeShellSessions.get(sessionId);
  if (existing) {
    try { existing.stream.end(); } catch { /* ignore */ }
    try { existing.conn.end(); } catch { /* ignore */ }
    activeShellSessions.delete(sessionId);
  }

  try {
    send({ type: "info", text: `正在建立 SSH 终端: ${username}@${ip}\n` });
    const conn = await connectSSH({ ip, username, password });
    send({ type: "info", text: `SSH 已连接: ${username}@${ip}\n` });

    return await new Promise((resolve) => {
      conn.shell({ term: "xterm-color", cols, rows }, (err, stream) => {
        if (err) {
          try { conn.end(); } catch { /* ignore */ }
          resolve({ success: false, error: `终端启动失败: ${err.message}` });
          return;
        }

        activeShellSessions.set(sessionId, { conn, stream, ip, username });
        let closed = false;
        const closeSession = (message) => {
          if (closed) return;
          closed = true;
          if (activeShellSessions.get(sessionId)?.stream === stream) {
            activeShellSessions.delete(sessionId);
          }
          send({ type: "exit", code: 0, text: `${message}\n` });
        };

        conn.on("close", () => {
          closeSession("SSH 终端已断开");
        });

        conn.on("error", (shellErr) => {
          send({ type: "stderr", text: `SSH 终端错误: ${shellErr.message}\n` });
        });

        stream.on("close", () => {
          try { conn.end(); } catch { /* ignore */ }
          closeSession("Shell 会话已结束");
        });

        stream.on("data", (data) => send({ type: "stdout", text: data.toString() }));
        if (stream.stderr) {
          stream.stderr.on("data", (data) => send({ type: "stderr", text: data.toString() }));
        }

        resolve({ success: true });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("ssh-shell-write", async (_event, { sessionId, data } = {}) => {
  const session = activeShellSessions.get(sessionId);
  if (!session || !session.stream) {
    return { success: false, error: "SSH 终端尚未连接" };
  }

  try {
    session.stream.write(data);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("ssh-shell-close", async (_event, { sessionId } = {}) => {
  const session = activeShellSessions.get(sessionId);
  if (!session) {
    return { success: true };
  }

  try { session.stream.end("exit\n"); } catch { /* ignore */ }
  try { session.conn.end(); } catch { /* ignore */ }
  activeShellSessions.delete(sessionId);
  return { success: true };
});

// ───────────────────────────────────────────────────────────
// IPC: Kill running script
// ───────────────────────────────────────────────────────────

ipcMain.handle("ssh-kill-script", async (_event, { ip, username, password }) => {
  const remoteScriptPath = getRemoteScriptPath(username);
  // Try via open connection first
  const conn = activeRunConnections.get(ip);
  if (conn) {
    try { conn.end(); } catch { /* ignore */ }
    activeRunConnections.delete(ip);
  }

  // Kill the python3 process on the Pi
  try {
    const killConn = await connectSSH({ ip, username, password });
    await execSSH(killConn, `pkill -f "${remoteScriptPath}" || true`);
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
  for (const session of activeShellSessions.values()) {
    try { session.stream.end(); } catch { /* ignore */ }
    try { session.conn.end(); } catch { /* ignore */ }
  }
  activeShellSessions.clear();
  if (process.platform !== "darwin") app.quit();
});
