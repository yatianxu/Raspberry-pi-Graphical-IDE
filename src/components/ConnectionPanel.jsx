/**
 * ConnectionPanel — SSH连接、设备发现、脚本上传运行面板
 */
import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_USERNAME = "wiz";
const DEFAULT_PASSWORD = "raspberry";
const MAX_CONSOLE_LINES = 500;
const SHELL_SESSION_ID = "connection-panel-shell";

function getRemoteScriptPath(username) {
    return `/home/${username}/carbot/main.py`;
}

/**
 * @param {object} props
 * @param {string} props.code - Python code to upload
 * @param {function({connected,running,ip}):void} props.onStatusChange
 */
export default function ConnectionPanel({ code, onStatusChange }) {
    const [ip, setIp] = useState("");
    const [username, setUsername] = useState(DEFAULT_USERNAME);
    const [password, setPassword] = useState(DEFAULT_PASSWORD);
    const [devices, setDevices] = useState([]);
    const [devicesCollapsed, setDevicesCollapsed] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [running, setRunning] = useState(false);
    const [connected, setConnected] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [shellConnected, setShellConnected] = useState(false);
    const [shellConnecting, setShellConnecting] = useState(false);
    const [terminalInput, setTerminalInput] = useState("");
    const [consoleLines, setConsoleLines] = useState([
        { text: "Raspberry Pi IDE — SSH 控制台就绪", type: "info" },
        { text: "请先发现或手动输入树莓派 IP，然后上传并运行脚本。", type: "info" },
    ]);

    const consoleRef = useRef(null);
    const remoteScriptPath = getRemoteScriptPath(username);
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
        onStatusChange?.({ connected: connected || shellConnected, running, ip });
    }, [connected, shellConnected, running, ip, onStatusChange]);

    useEffect(() => {
        return () => {
            if (window.electronAPI?.sshShellClose) {
                window.electronAPI.sshShellClose({ sessionId: SHELL_SESSION_ID }).catch(() => {});
            }
        };
    }, []);

    // --- 设备发现 ---
    const discover = async () => {
        if (!window.electronAPI?.discoverDevices) {
            appendLog("未检测到 Electron 环境，无法使用 SSH 自动发现功能", "warning");
            return;
        }
        setDiscovering(true);
        appendLog(`正在通过 SSH 探测局域网设备，使用账号 ${username}...`, "info");
        try {
            const result = await window.electronAPI.discoverDevices({
                username,
                password,
                timeoutMs: 6000,
            });
            const found = result?.devices || [];
            const loginSuccessDevices = found.filter((device) => device.loginOk);
            const loginFailedDevices = found.filter((device) => device.sshOpen && !device.loginOk);
            setDevices(found);

            if (result?.subnets?.length) {
                appendLog(
                    `本机扫描网段: ${result.subnets.map((subnet) => `${subnet.name} ${subnet.cidr}`).join(" | ")}`,
                    "info"
                );
            }
            appendLog(`已扫描 ${result?.scanned || 0} 个地址，发现 ${result?.sshOpenCount || 0} 台开放 SSH 端口的设备`, "info");
            if (found.length > 0) {
                setDevicesCollapsed(false);
            }

            if (loginSuccessDevices.length === 0 && loginFailedDevices.length === 0) {
                appendLog("未发现开放 SSH 端口的设备。请确认树莓派已开机、在同一局域网，并已启用 SSH。", "warning");
            } else {
                if (loginSuccessDevices.length > 0) {
                    appendLog(`已通过 SSH 验证 ${loginSuccessDevices.length} 台设备`, "success");
                    if (loginSuccessDevices.length === 1) {
                        setIp(loginSuccessDevices[0].ip);
                        appendLog(`已自动填入可登录设备 IP: ${loginSuccessDevices[0].ip}`, "success");
                    }
                }
                if (loginFailedDevices.length > 0) {
                    appendLog(
                        `发现 ${loginFailedDevices.length} 台 SSH 设备，但当前账号 ${username} 无法登录，请检查用户名或密码`,
                        "warning"
                    );
                    loginFailedDevices.forEach((device) => {
                        appendLog(`- ${device.ip}: ${device.error || "SSH 登录失败"}`, "warning");
                    });
                }
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
        if (!window.electronAPI?.sshUploadScript) {
            appendLog("功能需要 Electron 环境", "warning");
            return;
        }
        setUploading(true);
        appendLog(`正在连接 ${ip}...`, "info");

        try {
            const result = await window.electronAPI.sshUploadScript({
                ip, username, password, code,
            }, (progress) => {
                if (progress?.message) {
                    appendLog(progress.message, progress.status === "done" ? "success" : "info");
                }
            });
            if (result.success) {
                setConnected(true);
                appendLog(`✓ 脚本已上传到 ${remoteScriptPath}`, "success");
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
        appendLog(`▶ 运行 python3 ${remoteScriptPath}`, "info");

        window.electronAPI.sshRunScript(
            { ip, username, password },
            (data) => {
                if (data.type === "stdout") appendLog(data.text, "output");
                else if (data.type === "stderr") appendLog(data.text, "error");
                else if (data.type === "info") appendLog(data.text, "info");
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
            await window.electronAPI.sshKillScript({ ip, username, password });
            appendLog("■ 已发送停止信号", "warning");
        } catch {
            // ignore
        }
        setRunning(false);
    };

    const connectTerminal = async () => {
        if (!ip) { appendLog("请先填写树莓派 IP 地址", "error"); return; }
        if (!window.electronAPI?.sshShellOpen) {
            appendLog("功能需要 Electron 环境", "warning");
            return;
        }

        setShellConnecting(true);
        try {
            const result = await window.electronAPI.sshShellOpen(
                { sessionId: SHELL_SESSION_ID, ip, username, password },
                (data) => {
                    if (data.type === "stdout") appendLog(data.text, "output");
                    else if (data.type === "stderr") appendLog(data.text, "error");
                    else if (data.type === "info") appendLog(data.text, "info");
                    else if (data.type === "exit") {
                        if (data.text) appendLog(data.text, "warning");
                        setShellConnected(false);
                        setShellConnecting(false);
                    }
                }
            );

            if (result.success) {
                setShellConnected(true);
                appendLog("交互式 SSH 终端已就绪，可直接输入命令。", "success");
            } else {
                appendLog(`SSH 终端连接失败: ${result.error}`, "error");
            }
        } catch (e) {
            appendLog(`SSH 终端错误: ${e.message}`, "error");
        } finally {
            setShellConnecting(false);
        }
    };

    const disconnectTerminal = async () => {
        if (!window.electronAPI?.sshShellClose) {
            setShellConnected(false);
            return;
        }
        try {
            await window.electronAPI.sshShellClose({ sessionId: SHELL_SESSION_ID });
            appendLog("已请求断开 SSH 终端", "warning");
        } catch (e) {
            appendLog(`断开 SSH 终端失败: ${e.message}`, "error");
        }
        setShellConnected(false);
        setShellConnecting(false);
    };

    const submitTerminalInput = async () => {
        const command = terminalInput;
        if (!command.trim()) return;
        if (!shellConnected || !window.electronAPI?.sshShellWrite) {
            appendLog("请先连接 SSH 终端后再输入命令", "warning");
            return;
        }

        setTerminalInput("");
        const result = await window.electronAPI.sshShellWrite({
            sessionId: SHELL_SESSION_ID,
            data: `${command}\n`,
        });
        if (!result.success) {
            appendLog(`命令发送失败: ${result.error}`, "error");
        }
    };

    const copyConsole = async () => {
        const text = consoleLines.map((line) => line.text).join("");
        try {
            await navigator.clipboard.writeText(text);
            appendLog("已复制控制台内容", "success");
        } catch (e) {
            appendLog(`复制失败: ${e.message}`, "error");
        }
    };

    // --- 清除控制台 ---
    const clearConsole = () => setConsoleLines([]);

    return (
        <div className="panel-content" style={{ display: "flex", flexDirection: "column" }}>
            <div className="connection-panel connection-console-panel">
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
                        <div className="password-field-header">
                            <label className="field-label">密码</label>
                            <button
                                className="password-toggle-btn"
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? "隐藏" : "显示"}
                            </button>
                        </div>
                        <div className="password-input-wrap">
                            <input
                                className="field-input password-input"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="field-group">
                    <label className="field-label">上传目标路径</label>
                    <input className="field-input" type="text" value={remoteScriptPath} readOnly />
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
                    <button className="btn" style={{ flex: 1 }} onClick={shellConnected ? disconnectTerminal : connectTerminal} disabled={shellConnecting}>
                        {shellConnecting ? "⌛ 连接终端..." : shellConnected ? "🔌 断开终端" : "💻 连接终端"}
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

                {devices.length > 0 && (
                    <div>
                        <button
                            className="section-toggle"
                            type="button"
                            onClick={() => setDevicesCollapsed((prev) => !prev)}
                        >
                            <span className="section-title" style={{ marginBottom: "0" }}>
                                发现的设备
                            </span>
                            <span className="section-toggle-indicator">{devicesCollapsed ? "▸" : "▾"}</span>
                        </button>
                        {!devicesCollapsed && (
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
                                        <span className={`device-item-status ${d.loginOk ? "status-online" : "status-auth-failed"}`}>
                                            {d.loginOk ? "可登录" : "SSH已开"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="section-title" style={{ marginBottom: "0" }}>
                    SSH 控制台
                </div>
                <div className="console-panel">
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                        <button className="btn btn-icon" onClick={copyConsole} data-tooltip="复制控制台">⧉</button>
                        <button className="btn btn-icon" onClick={clearConsole} data-tooltip="清除控制台">🗑</button>
                    </div>
                    <div className="console-output" ref={consoleRef}>
                        {consoleLines.map((line, i) => (
                            <span key={i} className={`console-line ${line.type}`}>
                                {line.text}{"\n"}
                            </span>
                        ))}
                    </div>
                    <div className="terminal-input-bar">
                        <span className="terminal-prompt">{shellConnected ? `${username}@${ip || "pi"}$` : "$"}</span>
                        <input
                            className="terminal-input"
                            type="text"
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    submitTerminalInput();
                                }
                            }}
                            placeholder={shellConnected ? "输入命令并回车" : "先连接终端，再输入命令"}
                            disabled={!shellConnected}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
