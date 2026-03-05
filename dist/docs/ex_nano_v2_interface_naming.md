# EX NANO V2.0 扩展板接口命名与资源映射（AI 友好）

本文件用于**统一说明** RobEx 扩展板（EX NANO V2.0）在 **固件（STM32）** 与 **robexpy（Host 侧）** 中的接口命名、逻辑资源 ID、以及到 STM32 物理引脚的映射关系。

> 设计原则：**上层只使用“逻辑资源名/ID”（如 `G4`、`S0`、`M2`），不直接使用 STM32 物理引脚名**。物理引脚变更仅发生在固件映射层。

---

### 1) 命名规范（Name Convention）

- **舵机**：`S0..S3`
- **编码电机**：`M0..M3`
- **通用 GPIO/ADC**：`G0..G8`
- **循迹（5路光电）**：`T0..T4`
- **按键**：`SW1`、`SW2`
- **指示灯**：`LED1`、`LED2`

---

### 2) 逻辑资源 ID（Logic Resource ID）

固件侧的逻辑 ID / 命令定义位于（Host/固件共享）：
- `robex/firmware_ex/protocol/robex_flp_api.h`

robexpy 侧目前以 **“整数 ID”** 作为参数传入（例如 `Pin(4)` 表示 `G4`）。推荐上层以本文表格为准进行使用（后续可补充 Python 常量导出）。

> 重要提示：这里的 `20/21`（LED1/LED2）是 **扩展板(STM32)的逻辑资源 ID**，不是 Maix 主控的 GPIO 编号。  
> 使用这些 ID 前必须先 `robex.init()`（推荐用 `with robex.RobexSession(): ...`），否则会出现底层 `Invalid parameters...` 报错。

---

### 3) 舵机（Servo）

| Name | Logic ID | STM32 Pin | 备注 |
| --- | ---:| --- | --- |
| S0 | 0 | PB8 | PWM 舵机 |
| S1 | 1 | PB7 | PWM 舵机 |
| S2 | 2 | PB9 | PWM 舵机 |
| S3 | 3 | PB6 | PWM 舵机 |

**robexpy 用法示例：**

```python
import time, robex
from robex import Servo

with robex.RobexSession():
    for i in range(4):
        Servo(i).angle(90)
    time.sleep(0.5)
    for i in range(4):
        Servo(i).angle(-90)
```

---

### 4) 编码电机（Encoder Motor）

| Name | Logic ID | PWM Pin(A/B) | Encoder CS Pin |
| --- | ---:| --- | --- |
| M0 | 0 | PA3 / PA2 | PB12 |
| M1 | 1 | PA1 / PA0 | PC13 |
| M2 | 2 | PB1 / PB0 | PC14 |
| M3 | 3 | PA9 / PA8 | PC15 |

---

### 5) 通用 GPIO / ADC（G0..G8）

| Name | Logic ID | STM32 Pin | Func |
| --- | ---:| --- | --- |
| G0 | 0 | PC3 | GPIO / ADC |
| G1 | 1 | PC2 | GPIO / ADC |
| G2 | 2 | PC1 | GPIO / ADC |
| G3 | 3 | PC0 | GPIO / ADC |
| G4 | 4 | PA12 | GPIO |
| G5 | 5 | PB2 | GPIO |
| G6 | 6 | PA10 | GPIO |
| G7 | 7 | PC5 | GPIO |
| G8 | 8 | PC4 | GPIO |

---

### 6) 5 路循迹传感器（T0..T4）

| Name | Logic ID | STM32 Pin |
| --- | ---:| --- |
| T0 | 30 | PD2 |
| T1 | 31 | PC10 |
| T2 | 32 | PA11 |
| T3 | 33 | PB11 |
| T4 | 34 | PB10 |

---

### 7) 按键（SW1/SW2）与 LED（LED1/LED2）

| Name | Logic ID | STM32 Pin | 备注 |
| --- | ---:| --- | --- |
| SW1 | 10 | PB3 | **低电平为按下**（Active-Low） |
| SW2 | 11 | PB4 | **低电平为按下**（Active-Low） |
| LED1 | 20 | PB5 | 数字输出 |
| LED2 | 21 | PC6 | 数字输出 |

---

### 8) WS2812（NeoPixel）灯珠/灯带

**robexpy 模块**：`robex.neopixel.NeoPixel`（MicroPython 风格）

示例（假设 WS2812 数据线接到 `G6`，逻辑 ID=6）：

```python
import robex
from robex import NeoPixel

G6 = 6

with robex.RobexSession():
    np = NeoPixel(pin=G6, n=8)
    np[0] = (255, 0, 0)
    np[1] = (0, 255, 0)
    np.write()
```

