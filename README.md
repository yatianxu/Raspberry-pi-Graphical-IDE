# Raspberry Pi IDE

> **Windows 下树莓派5图形化编程软件** — Drag-and-drop Python programming for Raspberry Pi 5, powered by Blockly + React + Electron.

<p align="center">
  <img src="dist/images/icon_app.png" width="80" alt="logo"/>
</p>

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🧩 **图形化积木编程** | 基于 Blockly，拖拽积木即可生成 Python 代码 |
| 🍓 **树莓派5专属积木** | GPIO 输出/输入、PWM、舵机、电机、超声波、NeoPixel、I2C、UART |
| 🐍 **实时 Python 预览** | 积木变化时即时显示对应的 Python 代码 |
| 🔌 **SSH 一键部署** | 通过 SSH/SFTP 上传并运行脚本，实时显示程序输出 |
| 🔍 **自动设备发现** | 扫描局域网 SSH 端口，并区分“端口开放设备”和“凭据可登录设备” |
| 💻 **交互式 SSH 终端** | 在 IDE 内直接建立远程 shell，会话中可输入命令并查看回显 |
| 📟 **内置 SSH 控制台** | 支持控制台日志复制、手动清空、切换标签后保留状态 |
| 👁 **连接表单优化** | 支持密码显示/隐藏、发现设备列表折叠、设备状态标签显示 |
| 💾 **项目保存/加载** | 保存为 XML 格式，或直接导出 `.py` 文件 |

---

## 🎯 支持的积木类别

| 类别 | 库 | 积木数量 |
|------|----|---------|
| ⚙ 系统 / 时间 | `time` | 导入、延时(秒/毫秒)、打印、循环 |
| 💡 GPIO 输出 | `gpiozero` | LED、PWMLED、Buzzer、DigitalOutputDevice |
| 🔘 GPIO 输入 | `gpiozero` | Button、DigitalInputDevice、超声波(HC-SR04) |
| ⚡ PWM / 舵机 / 电机 | `gpiozero` | AngularServo、Motor、PWMOutputDevice |
| 🌈 LED 灯带 | `rpi_ws281x` | NeoPixel 颜色、彩虹、清除 |
| 🔗 I2C | `smbus2` | 打开总线、读/写字节 |
| 📡 UART | `pyserial` | 打开串口、发送、读取 |
| 内置逻辑/循环/数学/文本/变量/函数 | Python 内置 | Blockly 标准块 |

---

## 🚀 快速开始

### 1. 开发环境（Windows）

```bash
# 克隆仓库
git clone https://github.com/yourname/raspberry-pi-ide.git
cd raspberry-pi-ide

# 安装依赖
npm install

# 启动开发模式（Vite 热更新 + Electron）
npm run dev
```

> **要求**: Node.js ≥ 18，npm ≥ 9

---

### 2. 构建安装包

```bash
npm run pack
# 输出到 release/ 目录
```

---

### 3. 树莓派5 环境配置

在树莓派5上运行以下命令，安装所需 Python 库：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Python 依赖
pip3 install gpiozero rpi_ws281x smbus2 pyserial RPi.GPIO

# 启用 I2C 接口（如需 I2C 功能）
sudo raspi-config nonint do_i2c 0

# 启用 SPI 接口（如需 SPI 功能）
sudo raspi-config nonint do_spi 0

# 启用 UART（如需串口功能）
sudo raspi-config nonint do_serial_hw 0

# 添加用户到 gpio 组（使用 pi 用户时）
sudo usermod -aG gpio $USER

# 为 NeoPixel/WS2812 灯带，需要 root 权限运行
# 在 IDE 中使用 SSH root 账户，或配置 sudo 无密码
```

> **树莓派5注意**：`gpiozero` 在 RPi5 上使用 `lgpio` 后端，确保已安装 `python3-lgpio`：
> ```bash
> sudo apt install python3-lgpio
> ```

### 4. 启用 SSH

如果你希望在 IDE 中使用“自动发现”“上传脚本”“连接终端”等功能，请确认树莓派已开启 SSH：

```bash
sudo raspi-config nonint do_ssh 0
sudo systemctl enable ssh
sudo systemctl start ssh
```

你也可以直接在 Windows 终端测试：

```bash
ssh wiz@192.168.1.185
```

如果终端能连接，IDE 中的 SSH 上传、运行和终端连接通常也能正常工作。

---

## 📐 项目结构

```
raspberry-pi-ide/
├── electron/
│   ├── main.cjs          # Electron 主进程 (SSH, 自动发现, 交互式终端)
│   └── preload.cjs       # Context Bridge API 暴露
├── src/
│   ├── main.jsx          # React 入口
│   ├── App.jsx           # 根组件 (布局)
│   ├── components/
│   │   ├── BlocklyEditor.jsx    # Blockly 工作区 (暗色主题)
│   │   ├── CodeViewer.jsx       # Python 代码预览 (CodeMirror)
│   │   ├── ConnectionPanel.jsx  # SSH 连接/发现/终端/运行面板
│   │   └── Toolbar.jsx          # 顶部工具栏
│   ├── blocks/
│   │   ├── index.js             # 块注册入口 + Toolbox 定义
│   │   ├── rpi_gpio_output.js   # GPIO 输出块
│   │   ├── rpi_gpio_input.js    # GPIO 输入块
│   │   ├── rpi_pwm_servo.js     # PWM / 舵机 / 电机块
│   │   ├── rpi_neopixel.js      # NeoPixel 灯带块
│   │   └── rpi_system.js        # 系统 / I2C / UART 块
│   └── styles/
│       └── index.css            # 全局暗色主题样式
├── dist/                        # Vite 构建输出 (gitignored)
├── vite.config.js
├── index.html
├── package.json
└── README.md
```

---

## 🔌 SSH 工作流程

```
Windows IDE
   │
   ├─① SSH 连接 (用户名+密码)
   ├─② SFTP 上传 main.py → /home/<username>/carbot/main.py
   ├─③ ssh.exec("python3 -u /home/<username>/carbot/main.py") → 实时流式输出
   └─④ kill: pkill -f "/home/<username>/carbot/main.py"
```

---

## 🔎 自动发现逻辑

当前“自动发现”不是单纯的 UDP 广播，而是更接近真实 SSH 连接前的验证流程：

```text
读取本机 IPv4 网段
→ 扫描局域网中开放 22 端口的地址
→ 对开放地址尝试 SSH 登录
→ 区分：
   1. SSH 已开放但登录失败
   2. SSH 已开放且登录成功
```

这意味着你在界面中可以看到两类结果：

- `可登录`：当前用户名和密码可以直接连接
- `SSH已开`：22 端口开放，但当前凭据无法登录

这样可以更快区分“树莓派没开机”和“用户名/密码错误”。

---

## 💻 连接面板说明

连接页目前包含以下能力：

- 手动输入树莓派 IP、用户名、密码
- 显示动态上传目标路径：`/home/<username>/carbot/main.py`
- 自动发现并列出局域网 SSH 设备
- 一键上传脚本并运行
- 连接交互式 SSH 终端，直接输入命令
- 复制控制台内容或手动清空控制台
- 折叠“发现的设备”列表，减少界面占用
- 切换“代码 / 连接”标签后保留连接页状态，不会自动清空

---

## 🧪 常见排查

### 1. 自动发现提示“未发现开放 SSH 端口的设备”

请确认：

- 树莓派已开机
- Windows 与树莓派在同一局域网
- 树莓派已启用 SSH
- 路由器没有隔离客户端

### 2. 自动发现能看到 `SSH已开`，但没有 `可登录`

这通常表示：

- IP 是对的
- 树莓派 SSH 服务已经开启
- 但当前用户名或密码不正确

可以先在本机终端验证：

```bash
ssh <username>@<ip>
```

### 3. 终端能连，但 IDE 上传失败

请检查：

- 当前用户是否有写入 `/home/<username>/carbot/` 的权限
- 网络连接是否稳定
- 密码是否在 IDE 中填写正确

---

## 🤝 贡献指南

1. Fork 本仓库
2. 新建分支：`git checkout -b feature/你的功能`
3. 提交 Pull Request

欢迎贡献新的积木块模块！参考 `src/blocks/rpi_gpio_output.js` 的格式。

---

## 📄 License

[GPL-3.0](./LICENSE) — Raspberry Pi IDE Contributors
