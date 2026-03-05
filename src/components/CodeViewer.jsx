/**
 * CodeViewer — Read-only CodeMirror editor showing the generated Python code.
 * Uses the built-in dark theme from @uiw/react-codemirror to avoid
 * missing dependency issues with @codemirror/language or @lezer/highlight.
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
 * @param {string} props.code - Python source code to display
 */
export default function CodeViewer({ code }) {
    return (
        <div className="code-editor-wrap">
            <CodeMirror
                value={code}
                theme="dark"
                extensions={EXTENSIONS}
                readOnly={true}
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
