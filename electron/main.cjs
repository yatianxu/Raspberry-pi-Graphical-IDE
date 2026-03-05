const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const dgram = require("node:dgram");
const { execSync } = require("node:child_process");
const { Client } = require("ssh2");

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!DEV_SERVER_URL;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "RobEx IDE",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "public", "images", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Set to false to allow accessing node modules in preload if needed, or keep true if preload is simple. Actually ssh2 is used in main process.
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      shell.openExternal(url);
    } catch {
      // ignore
    }
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "..", "dist", "index.html");
    win.loadFile(indexHtml);
  }

  return win;
}

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function intToIpv4(num) {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join(".");
}

function getBroadcastAddrs() {
  const interfaces = os.networkInterfaces();
  const addrs = new Set();
  for (const infos of Object.values(interfaces)) {
    for (const info of infos || []) {
      if (info.family !== "IPv4" || info.internal) continue;
      if (!info.address || !info.netmask) continue;
      const ip = ipv4ToInt(info.address);
      const mask = ipv4ToInt(info.netmask);
      const broadcast = (ip & mask) | (~mask >>> 0);
      addrs.add(intToIpv4(broadcast));
    }
  }
  if (addrs.size === 0) addrs.add("255.255.255.255");
  return Array.from(addrs);
}

function getLocalSubnets() {
  const subnets = new Map();
  const addSubnet = (subnet) => {
    if (!subnet || !subnet.cidr) return;
    subnets.set(subnet.cidr, subnet);
  };

  if (process.platform === "win32") {
    const fromIpconfig = getLocalSubnetsFromIpconfig();
    fromIpconfig.forEach(addSubnet);
    const fromWmic = getLocalSubnetsFromWmic();
    fromWmic.forEach(addSubnet);
  }

  const interfaces = os.networkInterfaces();
  for (const infos of Object.values(interfaces)) {
    for (const info of infos || []) {
      if (info.family !== "IPv4" || info.internal) continue;
      if (!info.address || !info.netmask) continue;
      const ipInt = ipv4ToInt(info.address);
      const maskInt = ipv4ToInt(info.netmask);
      const network = ipInt & maskInt;
      const broadcast = network | (~maskInt >>> 0);
      let start = network + 1;
      let end = broadcast - 1;
      if (end < start) {
        start = network;
        end = network;
      }
      const prefixLen = netmaskToPrefix(info.netmask);
      const cidr = `${intToIpv4(network)}/${prefixLen}`;
      addSubnet({
        cidr,
        start: intToIpv4(start),
        end: intToIpv4(end),
      });
    }
  }

  return Array.from(subnets.values());
}

function getLocalSubnetsFromIpconfig() {
  try {
    const output = execSync("ipconfig", { encoding: "utf8" });
    const lines = output.split(/\r?\n/);
    const subnets = new Set();
    let ipv4 = null;
    let mask = null;
    let disconnected = false;
    let inAdapter = false;

    const flush = () => {
      if (!ipv4 || !mask || disconnected) {
        ipv4 = null;
        mask = null;
        disconnected = false;
        inAdapter = false;
        return;
      }
      const ipInt = ipv4ToInt(ipv4);
      const maskInt = ipv4ToInt(mask);
      const network = ipInt & maskInt;
      const broadcast = network | (~maskInt >>> 0);
      let start = network + 1;
      let end = broadcast - 1;
      if (end < start) {
        start = network;
        end = network;
      }
      const prefixLen = netmaskToPrefix(mask);
      const cidr = `${intToIpv4(network)}/${prefixLen}`;
      subnets.add(JSON.stringify({
        cidr,
        start: intToIpv4(start),
        end: intToIpv4(end),
      }));
      ipv4 = null;
      mask = null;
      disconnected = false;
      inAdapter = false;
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flush();
        continue;
      }
      if (line.endsWith(":") && (line.includes("适配器") || line.toLowerCase().includes("adapter"))) {
        flush();
        inAdapter = true;
        continue;
      }
      if (line.includes("媒体已断开") || line.toLowerCase().includes("media disconnected")) {
        disconnected = true;
      }
      if (!inAdapter && (line.includes("适配器") || line.toLowerCase().includes("adapter"))) {
        inAdapter = true;
      }
      if (line.toLowerCase().includes("ipv4")) {
        const match = line.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (match) {
          ipv4 = match[0];
        }
      }
      if (line.includes("子网掩码") || line.toLowerCase().includes("subnet mask")) {
        const match = line.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (match) {
          mask = match[0];
        }
      }
    }
    flush();
    return Array.from(subnets).map((s) => JSON.parse(s));
  } catch {
    return [];
  }
}

function getLocalSubnetsFromWmic() {
  try {
    const output = execSync("wmic nicconfig where IPEnabled=true get IPAddress,IPSubnet /format:csv", { encoding: "utf8" });
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const subnets = new Set();

    for (const line of lines) {
      if (line.toLowerCase().startsWith("node")) continue;
      const parts = line.split(",");
      if (parts.length < 3) continue;
      const ipPart = parts[1];
      const maskPart = parts[2];
      if (!ipPart || !maskPart) continue;
      const ipMatch = ipPart.match(/(\d{1,3}\.){3}\d{1,3}/);
      const maskMatch = maskPart.match(/(\d{1,3}\.){3}\d{1,3}/);
      if (!ipMatch || !maskMatch) continue;
      const ipv4 = ipMatch[0];
      const mask = maskMatch[0];
      const ipInt = ipv4ToInt(ipv4);
      const maskInt = ipv4ToInt(mask);
      const network = ipInt & maskInt;
      const broadcast = network | (~maskInt >>> 0);
      let start = network + 1;
      let end = broadcast - 1;
      if (end < start) {
        start = network;
        end = network;
      }
      const prefixLen = netmaskToPrefix(mask);
      const cidr = `${intToIpv4(network)}/${prefixLen}`;
      subnets.add(JSON.stringify({
        cidr,
        start: intToIpv4(start),
        end: intToIpv4(end),
      }));
    }

    return Array.from(subnets).map((s) => JSON.parse(s));
  } catch {
    return [];
  }
}

function netmaskToPrefix(mask) {
  const val = ipv4ToInt(mask);
  let bits = 0;
  for (let i = 31; i >= 0; i--) {
    if (val & (1 << i)) bits++;
  }
  return bits;
}

function isPrivate10(ip) {
  return typeof ip === "string" && ip.startsWith("10.");
}

function sortDevices(devices) {
  return devices.sort((a, b) => {
    const aIp = a.ip || "";
    const bIp = b.ip || "";
    const a10 = isPrivate10(aIp);
    const b10 = isPrivate10(bIp);
    if (a10 !== b10) return a10 ? -1 : 1;
    if (aIp && bIp) return ipv4ToInt(aIp) - ipv4ToInt(bIp);
    if (aIp && !bIp) return -1;
    if (!aIp && bIp) return 1;
    return 0;
  });
}

ipcMain.handle("udp-discovery", async (_event, { timeoutMs = 1200 } = {}) => {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const devices = new Map();
    const DISCOVERY_PORT = 45899;
    const DISCOVERY_MAGIC = "ROBEX_DISCOVERY";

    socket.on("message", (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString("utf-8"));
        if (!payload || payload.type !== "robex_discovery") return;
        const port = payload.port || 8080;
        const name = payload.name || "robex_app";
        const id = payload.id || "";
        const candidates = [];
        if (Array.isArray(payload.ips)) {
          for (const ip of payload.ips) {
            if (typeof ip === "string" && ip.trim()) {
              candidates.push(ip.trim());
            }
          }
        }
        if (payload.ip && typeof payload.ip === "string") {
          candidates.push(payload.ip.trim());
        }
        if (rinfo.address) {
          candidates.push(rinfo.address);
        }
        const uniqueIps = Array.from(new Set(candidates.filter(Boolean)));
        for (const ip of uniqueIps) {
          const device = { name, port, ip, id };
          const key = `${device.ip}:${device.port}:${device.id}`;
          devices.set(key, device);
        }
      } catch {
        // ignore
      }
    });

    socket.on("error", () => {
      // ignore
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
      } catch {
        // ignore
      }
      for (const addr of getBroadcastAddrs()) {
        socket.send(DISCOVERY_MAGIC, DISCOVERY_PORT, addr);
      }
    });

    setTimeout(() => {
      try {
        socket.close();
      } catch {
        // ignore
      }
      resolve(sortDevices(Array.from(devices.values())));
    }, timeoutMs);
  });
});

ipcMain.handle("get-local-subnets", async () => {
  return getLocalSubnets();
});

ipcMain.handle("select-whl-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Wheel Files", extensions: ["whl"] }],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("ssh-update", async (event, { ip, password, whlPath, progressChannel }) => {
  const sendProgress = (data) => {
    if (progressChannel) event.sender.send(progressChannel, data);
  };

  return new Promise((resolve) => {
    const conn = new Client();
    const filename = path.basename(whlPath);
    const remotePath = `/tmp/${filename}`;

    conn
      .on("ready", () => {
        sendProgress({ status: "connected", message: "SSH 已连接，准备上传..." });
        // Upload file via SFTP
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return resolve({ success: false, error: `SFTP Error: ${err.message}` });
          }

          const stats = fs.statSync(whlPath);
          const fileSize = stats.size;
          let uploadedSize = 0;

          const readStream = fs.createReadStream(whlPath);
          const writeStream = sftp.createWriteStream(remotePath);

          readStream.on("data", (chunk) => {
            uploadedSize += chunk.length;
            const percent = Math.round((uploadedSize / fileSize) * 100);
            sendProgress({ status: "uploading", progress: percent, message: `正在上传: ${percent}%` });
          });

          writeStream.on("close", () => {
            sendProgress({ status: "installing", message: "上传完成，正在安装 (pip install)..." });
            // Execute pip install
            conn.exec(
              `pip install --force-reinstall ${remotePath}`,
              (err, stream) => {
                if (err) {
                  conn.end();
                  return resolve({ success: false, error: `Exec Error: ${err.message}` });
                }

                let output = "";
                stream
                  .on("close", (code, signal) => {
                    conn.end();
                    if (code === 0) {
                      resolve({ success: true });
                    } else {
                      resolve({
                        success: false,
                        error: `安装失败，退出码: ${code}`,
                      });
                    }
                  })
                  .on("data", (data) => {
                    const text = data.toString();
                    output += text;
                    sendProgress({ status: "output", message: text });
                  })
                  .stderr.on("data", (data) => {
                    const text = data.toString();
                    output += text;
                    sendProgress({ status: "output", message: text });
                  });
              },
            );
          });

          writeStream.on("error", (err) => {
            conn.end();
            resolve({ success: false, error: `Upload Error: ${err.message}` });
          });

          readStream.pipe(writeStream);
        });
      })
      .on("error", (err) => {
        resolve({ success: false, error: `SSH Connection Error: ${err.message}` });
      })
      .connect({
        host: ip,
        port: 22,
        username: "root",
        password: password || "root",
      });
  });
});

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

