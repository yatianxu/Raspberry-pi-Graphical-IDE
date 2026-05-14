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

## 2026-05-14
- `ssh-shell-open` 通过 `conn.shell({ term: "xterm-color" })` 打开交互式 shell，树莓派 Bash 会返回 ANSI 颜色码、OSC 标题设置、bracketed paste 开关等控制序列；当前前端未做终端仿真，因此这些字节会被直接显示成“乱码”。
- `ConnectionPanel.jsx` 的日志区域使用普通 `<span>` 渲染文本，每条记录又额外补了 `"\n"`，说明它本质是纯文本日志窗，不适合直接承载原始终端控制码。
- `gpiozero` 的 `PWMSoftwareFallback` 是 Python warning，不是编码错误；触发点来自 `PWMOutputDevice` / `AngularServo` 等软件 PWM 回退路径。
- 当前积木生成代码里 `rpi_pwm_servo.js` 直接 `from gpiozero import AngularServo` / `PWMOutputDevice`，没有做 warnings 过滤，所以运行日志会把这条提示原样打印到 stderr。
- 已在 `ConnectionPanel.jsx` 中加入 ANSI/OSC/控制字符清洗，并按行存储日志；这会让 SSH 控制台退化为“纯文本终端视图”，不再保留颜色，但可读性显著更稳定。
- 已将 Electron 侧 shell `term` 从 `xterm-color` 调整为 `vt100`，用于减少 Bash 主动输出的终端特性控制码。
- 已在 PWM / 舵机 / 电机积木生成代码中统一插入 `warnings.filterwarnings("ignore", category=PWMSoftwareFallback)`，从源头静默这类提示。
- 这次处理的是“日志噪声”，不是软件 PWM 本身的硬实时能力；若用户要降低舵机抖动，仍应优先考虑 `pigpio` 或硬件 PWM 路线。
- 当前仓库对外说明文档只有 `README.md`，没有独立的 `docs/` 目录或其他用户文档入口。
- README 此前已经补入了 Python 可编辑、`pigpio`、`close()` 等说明，但仍缺少连接信息持久化、终端命令历史、手动代码上传行为和主进程安全发送修复的文档描述。
- README 项目结构里此前写的是 `vite.config.js`，与实际文件 `vite.config.mjs` 不一致，需要修正。
