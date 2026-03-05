/**
 * App.jsx — Root application component
 * Layout: Toolbar → [Blockly workspace | Right panel (Code / Connection)]
 * Status bar at bottom
 */
import { useState, useCallback } from "react";
import Toolbar from "./components/Toolbar.jsx";
import BlocklyEditor from "./components/BlocklyEditor.jsx";
import CodeViewer from "./components/CodeViewer.jsx";
import ConnectionPanel from "./components/ConnectionPanel.jsx";

const INITIAL_CODE = "# 拖拽积木块开始编程...\n";

// Tabs in the right panel
const RIGHT_TABS = [
    { id: "code", label: "🐍 Python 代码" },
    { id: "connect", label: "🔌 设备连接" },
];

export default function App() {
    const [code, setCode] = useState(INITIAL_CODE);
    const [activeTab, setActiveTab] = useState("code");
    const [connStatus, setConnStatus] = useState({ connected: false, running: false, ip: "" });

    const handleCodeChange = useCallback((newCode) => {
        setCode(newCode);
    }, []);

    const handleConnStatusChange = useCallback((status) => {
        setConnStatus(status);
    }, []);

    const codeLineCount = code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;

    return (
        <div className="app-shell">
            {/* Toolbar */}
            <Toolbar code={code} connStatus={connStatus} />

            {/* Main area */}
            <div className="main-content">
                {/* Blockly workspace — left */}
                <div className="workspace-panel">
                    <BlocklyEditor onCodeChange={handleCodeChange} />
                </div>

                {/* Right panel */}
                <div className="right-panel">
                    {/* Tabs */}
                    <div className="right-panel-tabs">
                        {RIGHT_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`panel-tab${activeTab === tab.id ? " active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Code viewer */}
                    {activeTab === "code" && <CodeViewer code={code} />}

                    {/* Connection panel */}
                    {activeTab === "connect" && (
                        <ConnectionPanel code={code} onStatusChange={handleConnStatusChange} />
                    )}
                </div>
            </div>

            {/* Status bar */}
            <div className="status-bar">
                <div className="status-item">
                    <div className={`status-dot${connStatus.running ? " running" : connStatus.connected ? " connected" : ""}`} />
                    <span>
                        {connStatus.running
                            ? `运行中 · ${connStatus.ip}`
                            : connStatus.connected
                                ? `已连接 · ${connStatus.ip}`
                                : "未连接"}
                    </span>
                </div>
                <div className="status-item">
                    <span>代码行数：{codeLineCount}</span>
                </div>
                <div style={{ flex: 1 }} />
                <div className="status-item">
                    <span style={{ color: "var(--accent)" }}>🍓 Raspberry Pi 5</span>
                </div>
                <div className="status-item">
                    <span>gpiozero · rpi_ws281x · smbus2 · pyserial</span>
                </div>
            </div>
        </div>
    );
}
