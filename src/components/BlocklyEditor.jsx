/**
 * BlocklyEditor Component
 * Mounts a Blockly workspace and emits generated Python code on change.
 */
import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";

// Import all RPi5 block definitions (registers blocks + generators as side-effects)
// and the toolbox config
import { RPI5_TOOLBOX } from "@/blocks/index.js";

// ─────────────────────────────────────────────────────────
// Theme — built lazily inside useEffect to avoid top-level
// Blockly API calls which can crash Vite's module transform.
// ─────────────────────────────────────────────────────────
function buildTheme() {
    // Blockly.Themes may or may not export Classic depending on the build.
    // We define our theme without a base to be safe.
    return Blockly.Theme.defineTheme("rpi_dark", {
        componentStyles: {
            workspaceBackgroundColour: "#1a1f2e",
            toolboxBackgroundColour: "#161b22",
            toolboxForegroundColour: "#e6edf3",
            flyoutBackgroundColour: "#1c2333",
            flyoutForegroundColour: "#e6edf3",
            flyoutOpacity: 0.95,
            scrollbarColour: "#484f58",
            insertionMarkerColour: "#3abe85",
            insertionMarkerOpacity: 0.3,
            scrollbarOpacity: 0.6,
            cursorColour: "#3abe85",
        },
        fontStyle: {
            family: '"Inter", system-ui, sans-serif',
            weight: "500",
            size: 13,
        },
        blockStyles: {
            logic_blocks: { colourPrimary: "#D65C5D" },
            loop_blocks: { colourPrimary: "#D65C5D" },
            math_blocks: { colourPrimary: "#5C81A6" },
            text_blocks: { colourPrimary: "#5CA6A6" },
            variable_blocks: { colourPrimary: "#A65C5C" },
            procedure_blocks: { colourPrimary: "#9A5CA6" },
        },
    });
}

/**
 * @param {object} props
 * @param {function(string): void} props.onCodeChange - called with generated Python code
 */
export default function BlocklyEditor({ onCodeChange }) {
    const containerRef = useRef(null);
    const workspaceRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Build theme once, inside effect (browser context, Blockly fully loaded)
        let theme;
        try {
            theme = buildTheme();
        } catch (e) {
            console.warn("Blockly theme creation failed, using default:", e);
            theme = undefined;
        }

        // Custom HTML Prompt for Blockly (native prompt() is not supported in many Electron environments)
        Blockly.dialog.setPrompt((message, defaultValue, callback) => {
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.style.zIndex = '10000';

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.width = '320px';

            const msg = document.createElement('div');
            msg.className = 'modal-title';
            msg.textContent = message;
            msg.style.fontSize = '14px';

            const input = document.createElement('input');
            input.className = 'field-input';
            input.value = defaultValue || '';
            input.style.width = '100%';
            input.style.marginTop = '10px';

            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            actions.style.marginTop = '16px';

            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn';
            btnCancel.textContent = '取消';

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.textContent = '确定';

            const close = (val) => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                if (callback) callback(val);
                // Return focus to Blockly
                workspace.markFocused();
            };

            btnOk.onclick = () => close(input.value);
            btnCancel.onclick = () => close(null);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            };

            actions.appendChild(btnCancel);
            actions.appendChild(btnOk);
            modal.appendChild(msg);
            modal.appendChild(input);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => input.focus(), 10);
        });

        // Custom HTML Confirm for Blockly & Toolbar
        const showCustomConfirm = (message, callback) => {
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.style.zIndex = '10001';

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.width = '300px';

            const msg = document.createElement('div');
            msg.className = 'modal-title';
            msg.textContent = message;
            msg.style.fontSize = '14px';
            msg.style.textAlign = 'center';

            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            actions.style.marginTop = '20px';
            actions.style.justifyContent = 'center';

            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn';
            btnCancel.textContent = '取消';

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.textContent = '确定';

            const close = (val) => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                if (callback) callback(val);
                // Return focus to Blockly
                workspace.markFocused();
            };

            btnOk.onclick = () => close(true);
            btnCancel.onclick = () => close(false);
            overlay.onclick = (e) => { if (e.target === overlay) close(false); };

            actions.appendChild(btnCancel);
            actions.appendChild(btnOk);
            modal.appendChild(msg);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            btnOk.focus();
        };

        Blockly.dialog.setConfirm(showCustomConfirm);
        window.__customConfirm = showCustomConfirm;

        const injectOptions = {
            toolbox: RPI5_TOOLBOX,
            grid: {
                spacing: 24,
                length: 3,
                colour: "rgba(255,255,255,0.04)",
                snap: true,
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 0.9,
                maxScale: 2,
                minScale: 0.3,
                scaleSpeed: 1.1,
            },
            trashcan: true,
            sounds: false,
            move: {
                scrollbars: { horizontal: true, vertical: true },
                drag: true,
                wheel: true,
            },
        };

        if (theme) injectOptions.theme = theme;

        const workspace = Blockly.inject(containerRef.current, injectOptions);
        workspaceRef.current = workspace;

        // Generate Python code on every workspace change
        const generateCode = () => {
            try {
                const code = pythonGenerator.workspaceToCode(workspace);
                onCodeChange(code || "# 拖拽积木块开始编程...\n");
            } catch (e) {
                onCodeChange(`# 代码生成错误: ${e.message}\n`);
            }
        };

        workspace.addChangeListener(generateCode);

        // Keep Blockly sized to its container
        const resizeObserver = new ResizeObserver(() => {
            Blockly.svgResize(workspace);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            workspace.dispose();
        };
    }, [onCodeChange]);

    // Expose workspace ref on window for toolbar buttons (undo/redo/clear)
    useEffect(() => {
        window.__blocklyWorkspace = workspaceRef;
        return () => {
            if (window.__blocklyWorkspace === workspaceRef) {
                delete window.__blocklyWorkspace;
            }
        };
    }, []);

    return (
        <div className="blockly-container" ref={containerRef} id="blockly-workspace" />
    );
}
