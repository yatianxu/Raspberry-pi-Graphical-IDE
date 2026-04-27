/**
 * Electron Preload — Raspberry Pi IDE
 * Exposes SSH and device-discovery APIs to the renderer via contextBridge.
 */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");
const shellListeners = new Map();

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Device Discovery ────────────────────────────────────
  discoverDevices: ({ username, password, timeoutMs = 6000, port = 22 }) =>
    ipcRenderer.invoke("ssh-discovery", { username, password, timeoutMs, port }),

  // ── SSH: Upload Python script ───────────────────────────
  sshUploadScript: ({ ip, username, password, code }, onProgress) => {
    const channel = `upload-progress-${Math.random().toString(36).slice(2)}`;
    let listener = null;
    if (typeof onProgress === "function") {
      listener = (_event, data) => onProgress(data);
      ipcRenderer.on(channel, listener);
    }

    return ipcRenderer.invoke("ssh-upload-script", {
      ip, username, password, code, progressChannel: channel,
    }).finally(() => {
      if (listener) {
        ipcRenderer.removeListener(channel, listener);
      }
    });
  },

  // ── SSH: Run script (streaming output via callback) ─────
  sshRunScript: ({ ip, username, password }, onData) => {
    const channel = `run-output-${Math.random().toString(36).slice(2)}`;
    const listener = (_event, data) => onData(data);
    ipcRenderer.on(channel, listener);
    // Fire & forget — invoke resolves immediately, stream comes via channel
    ipcRenderer
      .invoke("ssh-run-script", { ip, username, password, progressChannel: channel })
      .catch((err) => onData({ type: "stderr", text: String(err) }));
    // Return cleanup function
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // ── SSH: Kill running script ────────────────────────────
  sshKillScript: ({ ip, username, password }) =>
    ipcRenderer.invoke("ssh-kill-script", { ip, username, password }),

  // ── SSH: Interactive shell ──────────────────────────────
  sshShellOpen: ({ sessionId, ip, username, password }, onData) => {
    const channel = `shell-output-${sessionId}`;
    const existingListener = shellListeners.get(sessionId);
    if (existingListener) {
      ipcRenderer.removeListener(channel, existingListener);
      shellListeners.delete(sessionId);
    }

    let listener = null;
    if (typeof onData === "function") {
      listener = (_event, data) => onData(data);
      ipcRenderer.on(channel, listener);
      shellListeners.set(sessionId, listener);
    }

    return ipcRenderer.invoke("ssh-shell-open", {
      sessionId,
      ip,
      username,
      password,
      progressChannel: channel,
    });
  },

  sshShellWrite: ({ sessionId, data }) =>
    ipcRenderer.invoke("ssh-shell-write", { sessionId, data }),

  sshShellClose: ({ sessionId }) => {
    const channel = `shell-output-${sessionId}`;
    const listener = shellListeners.get(sessionId);
    if (listener) {
      ipcRenderer.removeListener(channel, listener);
      shellListeners.delete(sessionId);
    }
    return ipcRenderer.invoke("ssh-shell-close", { sessionId });
  },

  // ── Legacy: Select .whl file ────────────────────────────
  selectWhlFile: () => ipcRenderer.invoke("select-whl-file"),
});
