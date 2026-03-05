/**
 * ConnectionPanel — SSH连接、设备发现、脚本上传运行面板
 */
import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_USERNAME = "pi";
const DEFAULT_PASSWORD = "raspberry";
const MAX_CONSOLE_LINES = 500;

/**
 * @param {object} props
 * @param {string} props.code - Python code to upload
 * @param {function({connected,running,ip}):void} props.onStatusChange
 */
export default function ConnectionPanel({ code, onStatusChange }) {
    const [ip, setIp] = useState("");
    const [username, setUsername] = useState(DEFAULT_USERNAME);
    const [password, setPassword] = useState(DEFAULT_PASSWORD);
    const [filename, setFilename] = useState("main.py");
    const [devices, setDevices] = useState([]);
    const [discovering, setDiscovering] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [running, setRunning] = useState(false);
    const [connected, setConnected] = useState(false);
    const [consoleLines, setConsoleLines] = useState([
        { text: "Raspberry Pi IDE — SSH 控制台就绪", type: "info" },
        { text: "请先发现或手动输入树莓派 IP，然后上传并运行脚本。", type: "info" },
    ]);
    const [activeSubTab, setActiveSubTab] = useState("connect"); // connect | console

    const consoleRef = useRef(null);
    const runChannelRef = useRef(null);

    const appendLog = useCallback((text, type = "output") => {
        setConsoleLines((prev) => {
            const next = [...prev, { text, type }];
            return next.length > MAX_CONSOLE_LINES ? next.slice(-MAX_CONSOLE_LINES) : next;
        });
    }, []);

    // Auto scroll console
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleLines]);

    // Notify parent of connection/running state changes
    useEffect(() => {
        onStatusChange?.({ connected, running, ip });
    }, [connected, running, ip, onStatusChange]);

    // --- 设备发现 ---
    const discover = async () => {
        if (!window.electronAPI?.discoverDevices) {
            appendLog("未检测到 Electron 环境，无法使用 UDP 发现功能", "warning");
            return;
        }
        setDiscovering(true);
        appendLog("正在广播发现树莓派设备 (UDP 端口45899)...", "info");
        try {
            const found = await window.electronAPI.discoverDevices(2000);
            if (found.length === 0) {
                appendLog("未发现设备。请确认：① 树莓派已开机 ② 在同一局域网 ③ 树莓派运行了 RobEx 服务", "warning");
            } else {
                setDevices(found);
                appendLog(`发现 ${found.length} 个设备`, "success");
            }
        } catch (e) {
            appendLog(`发现失败: ${e.message}`, "error");
        } finally {
            setDiscovering(false);
        }
    };

    // --- 上传脚本 ---
    const upload = async () => {
        if (!ip) { appendLog("请先填写树莓派 IP 地址", "error"); return; }
        if (!code || code.trim() === "" || code.startsWith("# 拖拽")) {
            appendLog("请先在积木区编写程序", "error");
            return;
        }
        if (!window.electronAPI?.sshExec) {
            appendLog("功能需要 Electron 环境", "warning");
            return;
        }
        setUploading(true);
        setActiveSubTab("console");
        appendLog(`正在连接 ${ip}...`, "info");

        try {
            const result = await window.electronAPI.sshUploadScript({
                ip, username, password, filename, code,
                progressChannel: `upload-progress-${Date.now()}`,
            });
            if (result.success) {
                setConnected(true);
                appendLog(`✓ 脚本 "${filename}" 上传成功`, "success");
            } else {
                appendLog(`✗ 上传失败: ${result.error}`, "error");
            }
        } catch (e) {
            appendLog(`✗ 错误: ${e.message}`, "error");
        } finally {
            setUploading(false);
        }
    };

    // --- 运行脚本 ---
    const run = async () => {
        if (!ip) { appendLog("请先填写 IP", "error"); return; }
        if (!window.electronAPI?.sshRunScript) {
            appendLog("功能需要 Electron 环境", "warning");
            return;
        }
        setRunning(true);
        setActiveSubTab("console");
        const channel = `run-output-${Date.now()}`;
        runChannelRef.current = channel;

        appendLog(`▶ 运行 python3 /home/${username}/rpi_ide_scripts/${filename}`, "info");

        window.electronAPI.sshRunScript(
            { ip, username, password, filename, progressChannel: channel },
            (data) => {
                if (data.type === "stdout") appendLog(data.text, "output");
                else if (data.type === "stderr") appendLog(data.text, "error");
                else if (data.type === "exit") {
                    appendLog(`● 程序退出，返回码: ${data.code}`, data.code === 0 ? "success" : "error");
                    setRunning(false);
                }
            }
        );
    };

    // --- 停止 ---
    const stop = async () => {
        if (!window.electronAPI?.sshKillScript) {
            setRunning(false);
            return;
        }
        try {
            await window.electronAPI.sshKillScript({ ip, username, password, filename });
            appendLog("■ 已发送停止信号", "warning");
        } catch {
            // ignore
        }
        setRunning(false);
    };

    // --- 清除控制台 ---
    const clearConsole = () => setConsoleLines([]);

    return (
        <div className="panel-content" style={{ display: "flex", flexDirection: "column" }}>
            {/* Sub-tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                {[["connect", "🔌 连接"], ["console", "📟 控制台"]].map(([key, label]) => (
                    <button
                        key={key}
                        className={`panel-tab${activeSubTab === key ? " active" : ""}`}
                        onClick={() => setActiveSubTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Connect tab */}
            {activeSubTab === "connect" && (
                <div className="connection-panel">
                    <div>
                        <div className="section-title">树莓派连接</div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">IP 地址</label>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="例：192.168.1.100"
                            value={ip}
                            onChange={(e) => setIp(e.target.value.trim())}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        <div className="field-group" style={{ flex: 1 }}>
                            <label className="field-label">用户名</label>
                            <input className="field-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div className="field-group" style={{ flex: 1 }}>
                            <label className="field-label">密码</label>
                            <input className="field-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">脚本文件名</label>
                        <input
                            className="field-input"
                            type="text"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            placeholder="main.py"
                        />
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button className="btn" style={{ flex: 1 }} onClick={discover} disabled={discovering}>
                            {discovering ? "🔍 发现中..." : "🔍 自动发现"}
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={upload} disabled={uploading || running}>
                            {uploading ? "⬆ 上传中..." : "⬆ 上传脚本"}
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={run} disabled={running || uploading}>
                            {running ? "● 运行中..." : "▶ 运行"}
                        </button>
                        <button className="btn btn-danger" style={{ flex: 1 }} onClick={stop} disabled={!running}>
                            ■ 停止
                        </button>
                    </div>

                    {/* Discovered devices */}
                    {devices.length > 0 && (
                        <div>
                            <div className="section-title" style={{ marginBottom: "8px" }}>
                                发现的设备
                            </div>
                            <div className="device-list">
                                {devices.map((d) => (
                                    <div
                                        key={`${d.ip}:${d.port}`}
                                        className={`device-item${ip === d.ip ? " selected" : ""}`}
                                        onClick={() => setIp(d.ip)}
                                        title="点击选择"
                                    >
                                        <div className="device-item-info">
                                            <span className="device-item-name">{d.name || "树莓派"}</span>
                                            <span className="device-item-ip">{d.ip}:{d.port}</span>
                                        </div>
                                        <span className="device-item-status status-online">在线</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Console tab */}
            {activeSubTab === "console" && (
                <div className="console-panel">
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                        <button className="btn btn-icon" onClick={clearConsole} data-tooltip="清除控制台">🗑</button>
                    </div>
                    <div className="console-output" ref={consoleRef}>
                        {consoleLines.map((line, i) => (
                            <span key={i} className={`console-line ${line.type}`}>
                                {line.text}{"\n"}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
