/**
 * Raspberry Pi 5 — GPIO Output Blocks
 * Library: gpiozero
 * Generated Python targets RPi OS (Bookworm), Python 3.11+
 */
import * as Blockly from "blockly";
import { pythonGenerator, Order } from "blockly/python";

// ─────────────────────────────────────────────
// Helper: BCM pin dropdown options (GPIO 2–27)
// ─────────────────────────────────────────────
const BCM_PINS = Array.from({ length: 26 }, (_, i) => {
    const pin = i + 2;
    return [`GPIO ${pin}`, String(pin)];
});

// ─────────────────────────────────────────────
// Block Definitions
// ─────────────────────────────────────────────

Blockly.common.defineBlocksWithJsonArray([
    // --- Import gpiozero
    {
        type: "rpi_import_gpiozero",
        message0: "导入 gpiozero 库",
        previousStatement: null,
        nextStatement: null,
        colour: "#4A90D9",
        tooltip: "导入 gpiozero 所有常用类",
        helpUrl: "https://gpiozero.readthedocs.io",
    },

    // --- LED 创建
    {
        type: "rpi_led_create",
        message0: "创建 LED  引脚 %1 变量名 %2",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "led" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "在指定 BCM 引脚创建 LED 对象 (gpiozero.LED)",
    },

    // --- LED 开
    {
        type: "rpi_led_on",
        message0: "LED %1 点亮",
        args0: [{ type: "field_input", name: "VAR", text: "led" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "调用 led.on()",
    },

    // --- LED 关
    {
        type: "rpi_led_off",
        message0: "LED %1 熄灭",
        args0: [{ type: "field_input", name: "VAR", text: "led" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "调用 led.off()",
    },

    // --- LED 切换
    {
        type: "rpi_led_toggle",
        message0: "LED %1 切换状态",
        args0: [{ type: "field_input", name: "VAR", text: "led" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "调用 led.toggle()",
    },

    // --- LED 闪烁
    {
        type: "rpi_led_blink",
        message0: "LED %1 闪烁  亮 %2 秒  灭 %3 秒  次数 %4",
        args0: [
            { type: "field_input", name: "VAR", text: "led" },
            { type: "input_value", name: "ON_TIME", check: "Number" },
            { type: "input_value", name: "OFF_TIME", check: "Number" },
            { type: "input_value", name: "N", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "调用 led.blink(on_time, off_time, n=次数)",
    },

    // --- PWMLED 创建
    {
        type: "rpi_pwmled_create",
        message0: "创建 PWM LED  引脚 %1 变量名 %2",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "pwmled" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#7C5CA6",
        tooltip: "在指定引脚创建支持亮度调节的 PWMLED 对象",
    },

    // --- PWMLED 亮度
    {
        type: "rpi_pwmled_value",
        message0: "PWM LED %1 亮度 %2 (0.0 ~ 1.0)",
        args0: [
            { type: "field_input", name: "VAR", text: "pwmled" },
            { type: "input_value", name: "VALUE", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#7C5CA6",
        tooltip: "设置亮度，0.0 全灭，1.0 全亮",
    },

    // --- Buzzer 创建
    {
        type: "rpi_buzzer_create",
        message0: "创建蜂鸣器  引脚 %1 变量名 %2",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "buzzer" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#A6745C",
        tooltip: "创建 gpiozero.Buzzer 对象",
    },

    // --- Buzzer on/off
    {
        type: "rpi_buzzer_ctrl",
        message0: "蜂鸣器 %1 %2",
        args0: [
            { type: "field_input", name: "VAR", text: "buzzer" },
            {
                type: "field_dropdown",
                name: "ACTION",
                options: [
                    ["响", "on"],
                    ["停", "off"],
                    ["切换", "toggle"],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#A6745C",
        tooltip: "控制蜂鸣器开/关/切换",
    },

    // --- DigitalOutputDevice
    {
        type: "rpi_digital_output_create",
        message0: "创建数字输出  引脚 %1 变量名 %2 初始值 %3",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "dout" },
            {
                type: "field_dropdown",
                name: "INIT",
                options: [
                    ["低 (False)", "False"],
                    ["高 (True)", "True"],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "创建数字输出设备（继电器等），active_high=True",
    },

    // --- DigitalOutputDevice on/off
    {
        type: "rpi_digital_output_ctrl",
        message0: "数字输出 %1 %2",
        args0: [
            { type: "field_input", name: "VAR", text: "dout" },
            {
                type: "field_dropdown",
                name: "ACTION",
                options: [
                    ["开启 (on)", "on"],
                    ["关闭 (off)", "off"],
                    ["切换 (toggle)", "toggle"],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#5CA65C",
        tooltip: "控制数字输出设备",
    },
]);

// ─────────────────────────────────────────────
// Python Code Generators
// ─────────────────────────────────────────────

pythonGenerator.forBlock["rpi_import_gpiozero"] = function () {
    pythonGenerator.definitions_["import_gpiozero"] =
        "from gpiozero import LED, PWMLED, Button, Buzzer, AngularServo, Motor, DistanceSensor, DigitalOutputDevice, DigitalInputDevice";
    pythonGenerator.definitions_["import_signal"] =
        "from signal import pause";
    return "";
};

pythonGenerator.forBlock["rpi_led_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const varName = block.getFieldValue("VAR");
    return `${varName} = LED(${pin})\n`;
};

pythonGenerator.forBlock["rpi_led_on"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return `${varName}.on()\n`;
};

pythonGenerator.forBlock["rpi_led_off"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return `${varName}.off()\n`;
};

pythonGenerator.forBlock["rpi_led_toggle"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return `${varName}.toggle()\n`;
};

pythonGenerator.forBlock["rpi_led_blink"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const onTime = generator.valueToCode(block, "ON_TIME", Order.NONE) || "1";
    const offTime = generator.valueToCode(block, "OFF_TIME", Order.NONE) || "1";
    const n = generator.valueToCode(block, "N", Order.NONE) || "None";
    return `${varName}.blink(on_time=${onTime}, off_time=${offTime}, n=${n})\n`;
};

pythonGenerator.forBlock["rpi_pwmled_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const varName = block.getFieldValue("VAR");
    return `${varName} = PWMLED(${pin})\n`;
};

pythonGenerator.forBlock["rpi_pwmled_value"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "1.0";
    return `${varName}.value = ${value}\n`;
};

pythonGenerator.forBlock["rpi_buzzer_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const varName = block.getFieldValue("VAR");
    return `${varName} = Buzzer(${pin})\n`;
};

pythonGenerator.forBlock["rpi_buzzer_ctrl"] = function (block) {
    const varName = block.getFieldValue("VAR");
    const action = block.getFieldValue("ACTION");
    return `${varName}.${action}()\n`;
};

pythonGenerator.forBlock["rpi_digital_output_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const varName = block.getFieldValue("VAR");
    const init = block.getFieldValue("INIT");
    return `${varName} = DigitalOutputDevice(${pin}, initial_value=${init})\n`;
};

pythonGenerator.forBlock["rpi_digital_output_ctrl"] = function (block) {
    const varName = block.getFieldValue("VAR");
    const action = block.getFieldValue("ACTION");
    return `${varName}.${action}()\n`;
};
