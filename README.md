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
| 🔌 **SSH一键部署** | 通过 SSH 上传并运行脚本，实时显示程序输出 |
| 🔍 **自动设备发现** | UDP 广播自动发现局域网内的树莓派设备 |
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

---

## 📐 项目结构

```
raspberry-pi-ide/
├── electron/
│   ├── main.cjs          # Electron 主进程 (SSH, UDP 发现)
│   └── preload.cjs       # Context Bridge API 暴露
├── src/
│   ├── main.jsx          # React 入口
│   ├── App.jsx           # 根组件 (布局)
│   ├── components/
│   │   ├── BlocklyEditor.jsx    # Blockly 工作区 (暗色主题)
│   │   ├── CodeViewer.jsx       # Python 代码预览 (CodeMirror)
│   │   ├── ConnectionPanel.jsx  # SSH 连接/上传/运行面板
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
   ├─② SFTP 上传 main.py → /home/pi/rpi_ide_scripts/main.py
   ├─③ ssh.exec("python3 -u main.py") → 实时流式输出
   └─④ kill: pkill -f "main.py"
```

---

## 🤝 贡献指南

1. Fork 本仓库
2. 新建分支：`git checkout -b feature/你的功能`
3. 提交 Pull Request

欢迎贡献新的积木块模块！参考 `src/blocks/rpi_gpio_output.js` 的格式。

---

## 📄 License

[GPL-3.0](./LICENSE) — Raspberry Pi IDE Contributors
