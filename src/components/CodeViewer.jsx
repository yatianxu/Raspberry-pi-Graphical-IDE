/**
 * CodeViewer — Editable CodeMirror editor for generated Python code.
 */
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";

const EXTENSIONS = [
    python(),
    EditorView.lineWrapping,
    EditorView.theme({
        "&": {
            fontFamily: '"JetBrains Mono", "Consolas", monospace',
            fontSize: "13px",
            height: "100%",
        },
        ".cm-scroller": { overflow: "auto" },
        ".cm-content": { padding: "12px 0" },
    }),
];

/**
 * @param {object} props
 * @param {string} props.code - Current Python source code
 * @param {string} props.generatedCode - Latest code generated from Blockly
 * @param {boolean} props.isManualCode - Whether the current code has been manually edited
 * @param {function(string): void} props.onCodeChange - Called when the editor content changes
 */
export default function CodeViewer({ code, generatedCode, isManualCode, onCodeChange }) {
    return (
        <div className="code-editor-wrap">
            <div
                className="code-editor-hint"
                style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-dim)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <span>
                    {isManualCode
                        ? "当前以上次手动修改的 Python 代码为准；下次修改图形化积木时会重新覆盖。"
                        : "当前代码由图形化积木生成；你可以直接修改 Python，上传和运行会优先使用修改后的代码。"}
                </span>
                {isManualCode && (
                    <button className="btn" type="button" onClick={() => onCodeChange(generatedCode)}>
                        恢复积木代码
                    </button>
                )}
            </div>
            <CodeMirror
                value={code}
                theme="dark"
                extensions={EXTENSIONS}
                onChange={onCodeChange}
                basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: false,
                    highlightSpecialChars: false,
                    foldGutter: false,
                    drawSelection: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: false,
                    bracketMatching: true,
                    closeBrackets: false,
                    autocompletion: false,
                    rectangularSelection: false,
                    crosshairCursor: false,
                    highlightActiveLine: false,
                    highlightSelectionMatches: false,
                    closeBracketsKeymap: false,
                    searchKeymap: false,
                    foldKeymap: false,
                    completionKeymap: false,
                    lintKeymap: false,
                }}
            />
        </div>
    );
}
