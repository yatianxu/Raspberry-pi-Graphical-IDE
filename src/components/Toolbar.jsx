/**
 * Toolbar — Top application toolbar
 */
import { useState, useCallback } from "react";
import * as Blockly from "blockly";

/**
 * @param {object} props
 * @param {string} props.code - current generated Python
 * @param {object} props.connStatus - { connected, running, ip }
 */
export default function Toolbar({ code, connStatus }) {
    const [saving, setSaving] = useState(false);

    const clearWorkspace = () => {
        const ws = window.__blocklyWorkspace?.current;
        if (ws) {
            const msg = "确认清空工作区？此操作不可撤销。";
            if (window.__customConfirm) {
                window.__customConfirm(msg, (ok) => {
                    if (ok) ws.clear();
                });
            } else if (window.confirm(msg)) {
                ws.clear();
            }
        }
    };

    const undoWorkspace = () => {
        const ws = window.__blocklyWorkspace?.current;
        ws?.undo(false);
    };

    const redoWorkspace = () => {
        const ws = window.__blocklyWorkspace?.current;
        ws?.undo(true);
    };

    const saveXml = useCallback(() => {
        const ws = window.__blocklyWorkspace?.current;
        if (!ws) return;
        setSaving(true);
        try {
            const xml = Blockly.Xml.workspaceToDom(ws);
            const xmlText = Blockly.Xml.domToPrettyText(xml);
            const blob = new Blob([xmlText], { type: "text/xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "raspberry_project.xml";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("保存失败:", e);
        } finally {
            setSaving(false);
        }
    }, []);

    const openXml = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xml";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const ws = window.__blocklyWorkspace?.current;
                    if (!ws) return;
                    const xml = Blockly.utils.xml.textToDom(evt.target.result);
                    ws.clear();
                    Blockly.Xml.domToWorkspace(xml, ws);
                } catch (err) {
                    alert("文件格式错误: " + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const savePython = () => {
        if (!code || code.startsWith("# 拖拽")) return;
        const blob = new Blob([code], { type: "text/x-python;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "main.py";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="toolbar">
            {/* Logo */}
            <div className="toolbar-logo">
                <div className="toolbar-logo-icon">🍓</div>
                <span className="toolbar-logo-text">Raspberry Pi IDE</span>
                <span className="toolbar-logo-version">v0.2</span>
            </div>

            <div className="toolbar-divider" />

            {/* File group */}
            <div className="toolbar-group">
                <button className="btn" onClick={openXml} data-tooltip="打开项目 (.xml)">
                    📂 <span>打开</span>
                </button>
                <button className="btn" onClick={saveXml} data-tooltip="保存项目 (.xml)" disabled={saving}>
                    💾 <span>保存</span>
                </button>
                <button className="btn" onClick={savePython} data-tooltip="导出 Python (.py)">
                    🐍 <span>导出</span>
                </button>
                <button className="btn" onClick={clearWorkspace} data-tooltip="清空工作区 (不可撤销)">
                    🗑 <span>清空</span>
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Edit group */}
            <div className="toolbar-group">
                <button className="btn" onClick={undoWorkspace} data-tooltip="撤销上一步操作">
                    ↩ <span>撤销</span>
                </button>
                <button className="btn" onClick={redoWorkspace} data-tooltip="重做上一步操作">
                    ↪ <span>重做</span>
                </button>
            </div>

            <div className="toolbar-spacer" />

            {/* Connection status pill */}
            <div className="toolbar-group">
                {connStatus?.ip && (
                    <span style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                        padding: "4px 8px",
                        background: "var(--bg-surface-2)",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                    }}>
                        🍓 {connStatus.ip}
                    </span>
                )}
                {connStatus?.running && (
                    <span className="badge badge-green" style={{ animation: "pulse 1.5s infinite" }}>
                        ● 运行中
                    </span>
                )}
            </div>
        </div>
    );
}
