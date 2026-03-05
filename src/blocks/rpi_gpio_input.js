/**
 * Raspberry Pi 5 — GPIO Input Blocks
 * Library: gpiozero
 */
import * as Blockly from "blockly";
import { pythonGenerator, Order } from "blockly/python";

const BCM_PINS = Array.from({ length: 26 }, (_, i) => {
    const pin = i + 2;
    return [`GPIO ${pin}`, String(pin)];
});

Blockly.common.defineBlocksWithJsonArray([
    // --- Button 创建
    {
        type: "rpi_button_create",
        message0: "创建按键  引脚 %1 变量名 %2 下拉 %3",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "btn" },
            {
                type: "field_dropdown",
                name: "PULL",
                options: [
                    ["上拉 (Pull Up)", "True"],
                    ["下拉 (Pull Down)", "False"],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#A6745C",
        tooltip: "创建 gpiozero.Button，pull_up=True 时内部上拉",
    },

    // --- Button 是否按下
    {
        type: "rpi_button_is_pressed",
        message0: "按键 %1 是否按下",
        args0: [{ type: "field_input", name: "VAR", text: "btn" }],
        output: "Boolean",
        colour: "#A6745C",
        tooltip: "返回 True/False，表示按键当前是否被按下",
    },

    // --- Button 读值 (0/1)
    {
        type: "rpi_button_value",
        message0: "读取按键 %1 值",
        args0: [{ type: "field_input", name: "VAR", text: "btn" }],
        output: "Number",
        colour: "#A6745C",
        tooltip: "返回 1 (按下) 或 0 (释放)",
    },

    // --- Button 等待按下
    {
        type: "rpi_button_wait_press",
        message0: "等待按键 %1 按下  超时 %2 秒",
        args0: [
            { type: "field_input", name: "VAR", text: "btn" },
            { type: "input_value", name: "TIMEOUT", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#A6745C",
        tooltip: "阻塞等待，直到按键被按下或超时（None 表示永不超时）",
    },

    // --- DigitalInputDevice 创建
    {
        type: "rpi_digital_input_create",
        message0: "创建数字输入  引脚 %1 变量名 %2 上拉 %3",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "din" },
            {
                type: "field_dropdown",
                name: "PULL",
                options: [
                    ["上拉", "True"],
                    ["下拉", "False"],
                    ["悬空 (None)", "None"],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#A6745C",
        tooltip: "创建数字输入设备（PIR、霍尔传感器等）",
    },

    // --- DigitalInputDevice 读值
    {
        type: "rpi_digital_input_value",
        message0: "读数字输入 %1 值",
        args0: [{ type: "field_input", name: "VAR", text: "din" }],
        output: "Boolean",
        colour: "#A6745C",
        tooltip: "返回 True/False",
    },

    // --- 超声波测距
    {
        type: "rpi_ultrasonic_create",
        message0: "创建超声波  TRIG %1 ECHO %2 变量名 %3",
        args0: [
            { type: "field_dropdown", name: "TRIG", options: BCM_PINS },
            { type: "field_dropdown", name: "ECHO", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "sonar" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#5C81A6",
        tooltip: "创建 HC-SR04 超声波测距传感器 (gpiozero.DistanceSensor)",
    },

    // --- 超声波读距离
    {
        type: "rpi_ultrasonic_distance",
        message0: "超声波 %1 距离 (米)",
        args0: [{ type: "field_input", name: "VAR", text: "sonar" }],
        output: "Number",
        colour: "#5C81A6",
        tooltip: "返回浮点数，单位为米",
    },

    // --- 超声波读距离 (厘米)
    {
        type: "rpi_ultrasonic_distance_cm",
        message0: "超声波 %1 距离 (厘米)",
        args0: [{ type: "field_input", name: "VAR", text: "sonar" }],
        output: "Number",
        colour: "#5C81A6",
        tooltip: "返回浮点数，单位为厘米 (= distance * 100)",
    },
]);

// ─────────── Python Generators ───────────

pythonGenerator.forBlock["rpi_button_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const varName = block.getFieldValue("VAR");
    const pull = block.getFieldValue("PULL");
    return `${varName} = Button(${pin}, pull_up=${pull})\n`;
};

pythonGenerator.forBlock["rpi_button_is_pressed"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`${varName}.is_pressed`, Order.MEMBER];
};

pythonGenerator.forBlock["rpi_button_value"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`int(${varName}.is_pressed)`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["rpi_button_wait_press"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const timeout = generator.valueToCode(block, "TIMEOUT", Order.NONE) || "None";
    return `${varName}.wait_for_press(timeout=${timeout})\n`;
};

pythonGenerator.forBlock["rpi_digital_input_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const varName = block.getFieldValue("VAR");
    const pull = block.getFieldValue("PULL");
    return `${varName} = DigitalInputDevice(${pin}, pull_up=${pull})\n`;
};

pythonGenerator.forBlock["rpi_digital_input_value"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`${varName}.value`, Order.MEMBER];
};

pythonGenerator.forBlock["rpi_ultrasonic_create"] = function (block) {
    const trig = block.getFieldValue("TRIG");
    const echo = block.getFieldValue("ECHO");
    const varName = block.getFieldValue("VAR");
    pythonGenerator.definitions_["import_ultrasonic"] =
        "from gpiozero import DistanceSensor";
    return `${varName} = DistanceSensor(echo=${echo}, trigger=${trig})\n`;
};

pythonGenerator.forBlock["rpi_ultrasonic_distance"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`${varName}.distance`, Order.MEMBER];
};

pythonGenerator.forBlock["rpi_ultrasonic_distance_cm"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`round(${varName}.distance * 100, 2)`, Order.FUNCTION_CALL];
};
