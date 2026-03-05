/**
 * Raspberry Pi 5 — NeoPixel / WS2812 LED Strip Blocks
 * Library: rpi_ws281x
 * RPi5 requires the rpi-ws281x-python package and root access
 */
import * as Blockly from "blockly";
import { pythonGenerator, Order } from "blockly/python";

const BCM_PINS = Array.from({ length: 26 }, (_, i) => {
    const pin = i + 2;
    return [`GPIO ${pin}`, String(pin)];
});

Blockly.common.defineBlocksWithJsonArray([
    // --- 灯带初始化
    {
        type: "rpi_neopixel_create",
        message0: "创建 NeoPixel 灯带  数据引脚 %1  灯珠数量 %2  亮度 %3 (0~1)  变量名 %4",
        args0: [
            {
                type: "field_dropdown",
                name: "PIN",
                options: [
                    // WS2812 on RPi commonly uses GPIO 10 (SPI MOSI) or GPIO 18 (PWM0)
                    ["GPIO 10 (SPI MOSI)", "10"],
                    ["GPIO 18 (PWM0)", "18"],
                    ["GPIO 21", "21"],
                    ["GPIO 12 (PWM0)", "12"],
                ],
            },
            {
                type: "field_number",
                name: "COUNT",
                value: 8,
                min: 1,
                max: 1000,
                precision: 1,
            },
            {
                type: "field_number",
                name: "BRIGHTNESS",
                value: 0.5,
                min: 0,
                max: 1,
                precision: 0.01,
            },
            { type: "field_input", name: "VAR", text: "strip" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#A65C81",
        tooltip: "初始化 WS2812 灯带 (rpi_ws281x)，需要 sudo 运行",
    },

    // --- 全部颜色
    {
        type: "rpi_neopixel_fill",
        message0: "灯带 %1 全部设为颜色 R%2 G%3 B%4",
        args0: [
            { type: "field_input", name: "VAR", text: "strip" },
            { type: "input_value", name: "R", check: "Number" },
            { type: "input_value", name: "G", check: "Number" },
            { type: "input_value", name: "B", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#A65C81",
        tooltip: "设置全部灯珠颜色并刷新",
    },

    // --- 单个灯珠颜色
    {
        type: "rpi_neopixel_set_pixel",
        message0: "灯带 %1 第 %2 个  颜色 R%3 G%4 B%5",
        args0: [
            { type: "field_input", name: "VAR", text: "strip" },
            { type: "input_value", name: "INDEX", check: "Number" },
            { type: "input_value", name: "R", check: "Number" },
            { type: "input_value", name: "G", check: "Number" },
            { type: "input_value", name: "B", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#A65C81",
        tooltip: "设置指定索引灯珠颜色（0 起始）",
    },

    // --- 颜色选择器 (RGB输出值)
    {
        type: "rpi_color_picker",
        message0: "颜色 %1",
        args0: [
            { type: "field_colour", name: "COLOR", colour: "#ff0000" },
        ],
        output: "Array",
        colour: "#A65C81",
        tooltip: "拾色器，输出 (R, G, B) 元组",
    },

    // --- 刷新显示
    {
        type: "rpi_neopixel_show",
        message0: "灯带 %1 刷新显示",
        args0: [{ type: "field_input", name: "VAR", text: "strip" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#A65C81",
        tooltip: "调用 strip.show() 将缓冲区写入灯带",
    },

    // --- 清除/全灭
    {
        type: "rpi_neopixel_clear",
        message0: "灯带 %1 全部熄灭",
        args0: [{ type: "field_input", name: "VAR", text: "strip" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#A65C81",
        tooltip: "将所有灯珠设置为 (0,0,0) 并刷新",
    },

    // --- 彩虹效果
    {
        type: "rpi_neopixel_rainbow",
        message0: "灯带 %1 彩虹效果  偏移 %2",
        args0: [
            { type: "field_input", name: "VAR", text: "strip" },
            { type: "input_value", name: "OFFSET", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#A65C81",
        tooltip: "生成彩虹效果，offset 0~255",
    },
]);

// ─────────── Python Generators ───────────

const NEOPIXEL_HEADER = `from rpi_ws281x import PixelStrip, Color`;

pythonGenerator.forBlock["rpi_neopixel_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const count = block.getFieldValue("COUNT");
    const brightness = block.getFieldValue("BRIGHTNESS");
    const varName = block.getFieldValue("VAR");

    pythonGenerator.definitions_["import_ws281x"] = NEOPIXEL_HEADER;
    const lines = [
        `${varName} = PixelStrip(${count}, ${pin}, 800000, 5, False, int(${brightness} * 255), 0)`,
        `${varName}.begin()`,
    ];
    return lines.join("\n") + "\n";
};

pythonGenerator.forBlock["rpi_neopixel_fill"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const r = generator.valueToCode(block, "R", Order.NONE) || "0";
    const g = generator.valueToCode(block, "G", Order.NONE) || "0";
    const b = generator.valueToCode(block, "B", Order.NONE) || "0";
    return (
        `for _i in range(${varName}.numPixels()):\n` +
        `    ${varName}.setPixelColor(_i, Color(${r}, ${g}, ${b}))\n` +
        `${varName}.show()\n`
    );
};

pythonGenerator.forBlock["rpi_neopixel_set_pixel"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const idx = generator.valueToCode(block, "INDEX", Order.NONE) || "0";
    const r = generator.valueToCode(block, "R", Order.NONE) || "0";
    const g = generator.valueToCode(block, "G", Order.NONE) || "0";
    const b = generator.valueToCode(block, "B", Order.NONE) || "0";
    return `${varName}.setPixelColor(${idx}, Color(${r}, ${g}, ${b}))\n`;
};

pythonGenerator.forBlock["rpi_color_picker"] = function (block) {
    const color = block.getFieldValue("COLOR"); // e.g. "#ff0000"
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return [`(${r}, ${g}, ${b})`, Order.ATOMIC];
};

pythonGenerator.forBlock["rpi_neopixel_show"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return `${varName}.show()\n`;
};

pythonGenerator.forBlock["rpi_neopixel_clear"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return (
        `for _i in range(${varName}.numPixels()):\n` +
        `    ${varName}.setPixelColor(_i, Color(0, 0, 0))\n` +
        `${varName}.show()\n`
    );
};

pythonGenerator.forBlock["rpi_neopixel_rainbow"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const offset = generator.valueToCode(block, "OFFSET", Order.NONE) || "0";
    pythonGenerator.definitions_["fn_wheel"] = `def _wheel(pos):
    pos = int(pos) & 255
    if pos < 85:
        return Color(pos * 3, 255 - pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return Color(255 - pos * 3, 0, pos * 3)
    else:
        pos -= 170
        return Color(0, pos * 3, 255 - pos * 3)`;
    return (
        `for _i in range(${varName}.numPixels()):\n` +
        `    ${varName}.setPixelColor(_i, _wheel((int(_i * 256 / ${varName}.numPixels()) + ${offset}) & 255))\n` +
        `${varName}.show()\n`
    );
};
