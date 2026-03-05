/**
 * Raspberry Pi 5 — System / Time / I2C / UART Blocks
 */
import * as Blockly from "blockly";
import { pythonGenerator, Order } from "blockly/python";

Blockly.common.defineBlocksWithJsonArray([
    // ─── 系统 ───────────────────────────────────

    // --- 导入 time
    {
        type: "rpi_import_time",
        message0: "导入 time 库",
        previousStatement: null,
        nextStatement: null,
        colour: "#4A90D9",
        tooltip: "import time",
    },

    // --- 延时 (秒)
    {
        type: "rpi_sleep",
        message0: "延时 %1 秒",
        args0: [{ type: "input_value", name: "SEC", check: "Number" }],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#5C81A6",
        tooltip: "time.sleep(seconds)",
    },

    // --- 延时 (毫秒)
    {
        type: "rpi_sleep_ms",
        message0: "延时 %1 毫秒",
        args0: [{ type: "input_value", name: "MS", check: "Number" }],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#5C81A6",
        tooltip: "time.sleep(ms / 1000)",
    },

    // --- print
    {
        type: "rpi_print",
        message0: "打印 %1",
        args0: [{ type: "input_value", name: "TEXT" }],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#5C81A6",
        tooltip: "print(value)",
    },

    // --- 获取当前时间戳
    {
        type: "rpi_time_now",
        message0: "当前时间戳 (秒)",
        output: "Number",
        colour: "#5C81A6",
        tooltip: "time.time() — 返回 Unix 时间戳",
    },

    // --- 程序主循环 (while True)
    {
        type: "rpi_loop_forever",
        message0: "持续循环执行",
        message1: "%1",
        args1: [{ type: "input_statement", name: "BODY" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#5C81A6",
        tooltip: "生成 while True: 循环，Ctrl+C 可中断",
    },

    // ─── I2C (smbus2) ───────────────────────────

    {
        type: "rpi_i2c_open",
        message0: "打开 I2C  总线 %1  变量名 %2",
        args0: [
            {
                type: "field_dropdown",
                name: "BUS",
                options: [
                    ["I2C-1 (默认)", "1"],
                    ["I2C-3", "3"],
                    ["I2C-4", "4"],
                ],
            },
            { type: "field_input", name: "VAR", text: "bus" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#81A65C",
        tooltip: "from smbus2 import SMBus; bus = SMBus(1)",
    },

    {
        type: "rpi_i2c_write_byte",
        message0: "I2C %1 写字节  地址 %2 (hex)  寄存器 %3  值 %4",
        args0: [
            { type: "field_input", name: "VAR", text: "bus" },
            { type: "field_input", name: "ADDR", text: "0x3C" },
            { type: "input_value", name: "REG", check: "Number" },
            { type: "input_value", name: "VAL", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#81A65C",
        tooltip: "bus.write_byte_data(addr, register, value)",
    },

    {
        type: "rpi_i2c_read_byte",
        message0: "I2C %1 读字节  地址 %2 (hex)  寄存器 %3",
        args0: [
            { type: "field_input", name: "VAR", text: "bus" },
            { type: "field_input", name: "ADDR", text: "0x3C" },
            { type: "input_value", name: "REG", check: "Number" },
        ],
        inputsInline: true,
        output: "Number",
        colour: "#81A65C",
        tooltip: "bus.read_byte_data(addr, register)",
    },

    // ─── UART (pyserial) ────────────────────────

    {
        type: "rpi_uart_open",
        message0: "打开串口  端口 %1  波特率 %2  变量名 %3",
        args0: [
            {
                type: "field_dropdown",
                name: "PORT",
                options: [
                    ["/dev/ttyS0 (UART0)", "/dev/ttyS0"],
                    ["/dev/ttyAMA0 (UART0)", "/dev/ttyAMA0"],
                    ["/dev/ttyUSB0", "/dev/ttyUSB0"],
                    ["/dev/ttyUSB1", "/dev/ttyUSB1"],
                ],
            },
            {
                type: "field_dropdown",
                name: "BAUD",
                options: [
                    ["9600", "9600"],
                    ["19200", "19200"],
                    ["38400", "38400"],
                    ["57600", "57600"],
                    ["115200", "115200"],
                ],
            },
            { type: "field_input", name: "VAR", text: "ser" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: "#A6905C",
        tooltip: "import serial; ser = serial.Serial(port, baudrate, timeout=1)",
    },

    {
        type: "rpi_uart_write",
        message0: "串口 %1 发送 %2",
        args0: [
            { type: "field_input", name: "VAR", text: "ser" },
            { type: "input_value", name: "DATA" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: "#A6905C",
        tooltip: "ser.write(data.encode()) — 发送字符串",
    },

    {
        type: "rpi_uart_readline",
        message0: "串口 %1 读一行",
        args0: [{ type: "field_input", name: "VAR", text: "ser" }],
        output: "String",
        colour: "#A6905C",
        tooltip: "ser.readline().decode().strip()",
    },

    {
        type: "rpi_uart_available",
        message0: "串口 %1 有数据",
        args0: [{ type: "field_input", name: "VAR", text: "ser" }],
        output: "Boolean",
        colour: "#A6905C",
        tooltip: "ser.in_waiting > 0",
    },
]);

// ─────────── Python Generators ───────────

pythonGenerator.forBlock["rpi_import_time"] = function () {
    pythonGenerator.definitions_["import_time"] = "import time";
    return "";
};

pythonGenerator.forBlock["rpi_sleep"] = function (block, generator) {
    pythonGenerator.definitions_["import_time"] = "import time";
    const sec = generator.valueToCode(block, "SEC", Order.NONE) || "1";
    return `time.sleep(${sec})\n`;
};

pythonGenerator.forBlock["rpi_sleep_ms"] = function (block, generator) {
    pythonGenerator.definitions_["import_time"] = "import time";
    const ms = generator.valueToCode(block, "MS", Order.NONE) || "1000";
    return `time.sleep(${ms} / 1000)\n`;
};

pythonGenerator.forBlock["rpi_print"] = function (block, generator) {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "''";
    return `print(${text})\n`;
};

pythonGenerator.forBlock["rpi_time_now"] = function () {
    pythonGenerator.definitions_["import_time"] = "import time";
    return ["time.time()", Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["rpi_loop_forever"] = function (block, generator) {
    const body = generator.statementToCode(block, "BODY") || "    pass\n";
    return `while True:\n${body}`;
};

pythonGenerator.forBlock["rpi_i2c_open"] = function (block) {
    const bus = block.getFieldValue("BUS");
    const varName = block.getFieldValue("VAR");
    pythonGenerator.definitions_["import_smbus"] =
        "from smbus2 import SMBus";
    return `${varName} = SMBus(${bus})\n`;
};

pythonGenerator.forBlock["rpi_i2c_write_byte"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const addr = block.getFieldValue("ADDR");
    const reg = generator.valueToCode(block, "REG", Order.NONE) || "0";
    const val = generator.valueToCode(block, "VAL", Order.NONE) || "0";
    return `${varName}.write_byte_data(${addr}, ${reg}, ${val})\n`;
};

pythonGenerator.forBlock["rpi_i2c_read_byte"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const addr = block.getFieldValue("ADDR");
    const reg = generator.valueToCode(block, "REG", Order.NONE) || "0";
    return [`${varName}.read_byte_data(${addr}, ${reg})`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["rpi_uart_open"] = function (block) {
    const port = block.getFieldValue("PORT");
    const baud = block.getFieldValue("BAUD");
    const varName = block.getFieldValue("VAR");
    pythonGenerator.definitions_["import_serial"] = "import serial";
    return `${varName} = serial.Serial("${port}", ${baud}, timeout=1)\n`;
};

pythonGenerator.forBlock["rpi_uart_write"] = function (block, generator) {
    const varName = block.getFieldValue("VAR");
    const data = generator.valueToCode(block, "DATA", Order.NONE) || "''";
    return `${varName}.write(str(${data}).encode())\n`;
};

pythonGenerator.forBlock["rpi_uart_readline"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`${varName}.readline().decode().strip()`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["rpi_uart_available"] = function (block) {
    const varName = block.getFieldValue("VAR");
    return [`${varName}.in_waiting > 0`, Order.RELATIONAL];
};
