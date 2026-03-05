const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sshUpdate: (ip, password, whlPath, onProgress) => {
    const channel = `ssh-update-progress-${Math.random().toString(36).slice(2)}`;
    const listener = (event, data) => onProgress(data);
    ipcRenderer.on(channel, listener);
    return ipcRenderer.invoke("ssh-update", { ip, password, whlPath, progressChannel: channel })
      .finally(() => ipcRenderer.removeListener(channel, listener));
  },
  selectWhlFile: () => ipcRenderer.invoke("select-whl-file"),
  discoverDevices: (timeoutMs = 1200) => ipcRenderer.invoke("udp-discovery", { timeoutMs }),
  getLocalSubnets: () => ipcRenderer.invoke("get-local-subnets"),
});
