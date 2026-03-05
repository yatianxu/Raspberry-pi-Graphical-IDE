/**
 * Electron Preload — Raspberry Pi IDE
 * Exposes SSH and device-discovery APIs to the renderer via contextBridge.
 */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Device Discovery ────────────────────────────────────
  discoverDevices: (timeoutMs = 2000) =>
    ipcRenderer.invoke("udp-discovery", { timeoutMs }),

  // ── SSH: Upload Python script ───────────────────────────
  sshUploadScript: ({ ip, username, password, filename, code, progressChannel }) => {
    const channel = progressChannel || `upload-progress-${Math.random().toString(36).slice(2)}`;
    return ipcRenderer.invoke("ssh-upload-script", {
      ip, username, password, filename, code, progressChannel: channel,
    });
  },

  // ── SSH: Run script (streaming output via callback) ─────
  sshRunScript: ({ ip, username, password, filename }, onData) => {
    const channel = `run-output-${Math.random().toString(36).slice(2)}`;
    const listener = (_event, data) => onData(data);
    ipcRenderer.on(channel, listener);
    // Fire & forget — invoke resolves immediately, stream comes via channel
    ipcRenderer
      .invoke("ssh-run-script", { ip, username, password, filename, progressChannel: channel })
      .catch((err) => onData({ type: "stderr", text: String(err) }));
    // Return cleanup function
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // ── SSH: Kill running script ────────────────────────────
  sshKillScript: ({ ip, username, password, filename }) =>
    ipcRenderer.invoke("ssh-kill-script", { ip, username, password, filename }),

  // ── Legacy: Select .whl file ────────────────────────────
  selectWhlFile: () => ipcRenderer.invoke("select-whl-file"),
});
