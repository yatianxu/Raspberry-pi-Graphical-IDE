# Findings

## 2026-04-27
- `electron/main.cjs` 中 UDP 发现仍依赖 `ROBEX_DISCOVERY` 和 `robex_discovery` 类型字段。
- `electron/main.cjs` 的上传与运行路径当前是 `/home/${username}/rpi_ide_scripts/${filename}`，与目标 `/home/wiz/carbot/main.py` 不一致。
- `src/components/ConnectionPanel.jsx` 默认文件名为 `main.py`，UI 暴露了脚本文件名输入框，运行日志也仍显示旧路径。
- `ConnectionPanel.jsx` 里上传前错误判断用了 `window.electronAPI?.sshExec`，但 preload 暴露的是 `sshUploadScript`，这是一个现存可疑点。
- `index.html` 的 CSP 仅允许 `img-src 'self' data:`，会拦截 Blockly 默认从 `https://blockly-demo.appspot.com/static/media/sprites.png` 拉取的图片。
- `README.md` 的 SSH 工作流程说明仍是旧目录 `/home/pi/rpi_ide_scripts/main.py`。
- 已将 Electron 主进程远端脚本路径统一为 `/home/wiz/carbot/main.py`，上传、运行、停止都改为使用这一固定路径。
- `preload.cjs` 现已支持上传阶段的进度回调，`ConnectionPanel.jsx` 会把连接、建目录、上传完成等信息直接写入内置控制台。
- `ConnectionPanel.jsx` 默认用户名已改为 `wiz`，文件名输入改为只读的目标路径展示，避免与固定上传路径冲突。
- `index.html` 的 CSP 已允许 `https://blockly-demo.appspot.com` 作为图片源，用于加载 Blockly 精灵图。
