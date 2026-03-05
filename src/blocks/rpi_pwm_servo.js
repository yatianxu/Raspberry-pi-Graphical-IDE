/**
 * Raspberry Pi 5 — PWM, Servo & Motor Blocks
 * Library: gpiozero (AngularServo, Motor, PWMOutputDevice)
 */
import * as Blockly from "blockly";
import { pythonGenerator, Order } from "blockly/python";

const BCM_PINS = Array.from({ length: 26 }, (_, i) => {
    const pin = i + 2;
    return [`GPIO ${pin}`, String(pin)];
});

Blockly.common.defineBlocksWithJsonArray([
    // --- Servo 创建
    {
        type: "rpi_servo_create",
        message0: "创建舵机  引脚 %1  最小角度 %2°  最大角度 %3°  变量名 %4",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            {
                type: "field_number",
                name: "MIN_ANGLE",
                value: -90,
                min: -180,
                max: 0,
                precision: 1,
            },
            {
                type: "field_number",
                name: "MAX_ANGLE",
                value: 90,
                min: 1,
                max: 180,
                precision: 1,
            },
            { type: "field_input", name: "VAR", text: "servo" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#5C68A6",
        tooltip: "创建 gpiozero.AngularServo，使用标准 50Hz PWM",
    },

    // --- Servo 角度
    {
        type: "rpi_servo_angle",
        message0: "舵机 %1 角度 %2 °",
        args0: [
            { type: "field_input", name: "VAR", text: "servo" },
            { type: "input_value", name: "ANGLE", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#5C68A6",
        tooltip: "设置舵机角度",
    },

    // --- Servo 读角度
    {
        type: "rpi_servo_read_angle",
        message0: "读舵机 %1 当前角度",
        args0: [{ type: "field_input", name: "VAR", text: "servo" }],
        output: "Number",
        colour: "#5C68A6",
        tooltip: "返回当前角度值",
    },

    // --- Servo detach
    {
        type: "rpi_servo_detach",
        message0: "舵机 %1 断开 (省电)",
        args0: [{ type: "field_input", name: "VAR", text: "servo" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#5C68A6",
        tooltip: "servo.detach() — 停止发送 PWM 信号，舵机省电",
    },

    // --- Motor 创建
    {
        type: "rpi_motor_create",
        message0: "创建电机  正转引脚 %1  反转引脚 %2  变量名 %3",
        args0: [
            { type: "field_dropdown", name: "FORWARD", options: BCM_PINS },
            { type: "field_dropdown", name: "BACKWARD", options: BCM_PINS },
            { type: "field_input", name: "VAR", text: "motor" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#5C68A6",
        tooltip: "创建 gpiozero.Motor (H桥驱动，如 L298N)",
    },

    // --- Motor 速度方向
    {
        type: "rpi_motor_run",
        message0: "电机 %1 %2  速度 %3 (0.0~1.0)",
        args0: [
            { type: "field_input", name: "VAR", text: "motor" },
            {
                type: "field_dropdown",
                name: "DIR",
                options: [
                    ["正转", "forward"],
                    ["反转", "backward"],
                ],
            },
            { type: "input_value", name: "SPEED", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#5C68A6",
        tooltip: "速度 0.0~1.0，方向正转/反转",
    },

    // --- Motor 停止
    {
        type: "rpi_motor_stop",
        message0: "电机 %1 停止",
        args0: [{ type: "field_input", name: "VAR", text: "motor" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#5C68A6",
        tooltip: "motor.stop()",
    },

    // --- PWMOutputDevice
    {
        type: "rpi_pwm_output_create",
        message0: "创建 PWM 输出  引脚 %1  频率 %2 Hz  变量名 %3",
        args0: [
            { type: "field_dropdown", name: "PIN", options: BCM_PINS },
            {
                type: "field_number",
                name: "FREQ",
                value: 100,
                min: 1,
                max: 50000,
                precision: 1,
            },
            { type: "field_input", name: "VAR", text: "pwm" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#7C5CA6",
        tooltip: "创建 gpiozero.PWMOutputDevice",
    },

    // --- PWM 占空比
    {
        type: "rpi_pwm_value",
        message0: "PWM %1 占空比 %2 (0.0~1.0)",
        args0: [
            { type: "field_input", name: "VAR", text: "pwm" },
            { type: "input_value", name: "VALUE", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#7C5CA6",
        tooltip: "设置 PWM 占空比，0.0~1.0",
    },
]);

// ─────────── Python Generators ───────────

pythonGenerator.forBlock["rpi_servo_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const minA = block.getFieldValue("MIN_ANGLE");
    const maxA = block.getFieldValue("MAX_ANGLE");
    const varName = block.getFieldValue("VAR");
    pythonGenerator.definitions_["import_servo"] =
        "from gpiozero import AngularServo";
    return `${varName} = AngularServo(${pin}, min_angle=${minA}, max_angle=${maxA})\n`;
};

pythonGenerator.forBlock["rpi_servo_angle"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const angle = generator.valueToCode(block, "ANGLE", Order.NONE) || "0";
    return `${varName}.angle = ${angle}\n`;
};

pythonGenerator.forBlock["rpi_servo_read_angle"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`${varName}.angle`, Order.MEMBER];
};

pythonGenerator.forBlock["rpi_servo_detach"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return `${varName}.detach()\n`;
};

pythonGenerator.forBlock["rpi_motor_create"] = function (block) {
    const fwd = block.getFieldValue("FORWARD");
    const bwd = block.getFieldValue("BACKWARD");
    const varName = block.getFieldValue("VAR");
    pythonGenerator.definitions_["import_motor"] =
        "from gpiozero import Motor";
    return `${varName} = Motor(forward=${fwd}, backward=${bwd})\n`;
};

pythonGenerator.forBlock["rpi_motor_run"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const dir = block.getFieldValue("DIR");
    const speed = generator.valueToCode(block, "SPEED", Order.NONE) || "0.5";
    return `${varName}.${dir}(${speed})\n`;
};

pythonGenerator.forBlock["rpi_motor_stop"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return `${varName}.stop()\n`;
};

pythonGenerator.forBlock["rpi_pwm_output_create"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const freq = block.getFieldValue("FREQ");
    const varName = block.getFieldValue("VAR");
    pythonGenerator.definitions_["import_pwm"] =
        "from gpiozero import PWMOutputDevice";
    return `${varName} = PWMOutputDevice(${pin}, frequency=${freq})\n`;
};

pythonGenerator.forBlock["rpi_pwm_value"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0.5";
    return `${varName}.value = ${value}\n`;
};
