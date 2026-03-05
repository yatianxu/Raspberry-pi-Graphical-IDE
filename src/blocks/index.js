/**
 * Raspberry Pi 5 — All Block Definitions
 * Import this file once to register all RPi5 blocks with Blockly.
 */

// Side-effect imports — each module registers blocks + Python generators
import "./rpi_gpio_output.js";
import "./rpi_gpio_input.js";
import "./rpi_pwm_servo.js";
import "./rpi_neopixel.js";
import "./rpi_system.js";

/**
 * Blockly Toolbox XML definition for Raspberry Pi 5
 * Categories match the block modules above.
 */
export const RPI5_TOOLBOX = {
    kind: "categoryToolbox",
    contents: [
        // ─── 系统 ──────────────────────────────────────────
        {
            kind: "category",
            name: "⚙ 系统",
            colour: "#4A90D9",
            contents: [
                { kind: "block", type: "rpi_import_gpiozero" },
                { kind: "block", type: "rpi_import_time" },
                { kind: "block", type: "rpi_sleep", inputs: { SEC: { block: { type: "math_number", fields: { NUM: 1 } } } } },
                { kind: "block", type: "rpi_sleep_ms", inputs: { MS: { block: { type: "math_number", fields: { NUM: 500 } } } } },
                { kind: "block", type: "rpi_print", inputs: { TEXT: { block: { type: "text", fields: { TEXT: "Hello RPi!" } } } } },
                { kind: "block", type: "rpi_time_now" },
                { kind: "block", type: "rpi_loop_forever" },
            ],
        },

        // ─── GPIO 输出 ─────────────────────────────────────
        {
            kind: "category",
            name: "💡 GPIO 输出",
            colour: "#5CA65C",
            contents: [
                { kind: "block", type: "rpi_led_create" },
                { kind: "block", type: "rpi_led_on" },
                { kind: "block", type: "rpi_led_off" },
                { kind: "block", type: "rpi_led_toggle" },
                {
                    kind: "block",
                    type: "rpi_led_blink",
                    inputs: {
                        ON_TIME: { block: { type: "math_number", fields: { NUM: 0.5 } } },
                        OFF_TIME: { block: { type: "math_number", fields: { NUM: 0.5 } } },
                        N: { block: { type: "math_number", fields: { NUM: 3 } } },
                    },
                },
                { kind: "separator" },
                { kind: "block", type: "rpi_pwmled_create" },
                {
                    kind: "block",
                    type: "rpi_pwmled_value",
                    inputs: { VALUE: { block: { type: "math_number", fields: { NUM: 0.5 } } } },
                },
                { kind: "separator" },
                { kind: "block", type: "rpi_buzzer_create" },
                { kind: "block", type: "rpi_buzzer_ctrl" },
                { kind: "separator" },
                { kind: "block", type: "rpi_digital_output_create" },
                { kind: "block", type: "rpi_digital_output_ctrl" },
            ],
        },

        // ─── GPIO 输入 ─────────────────────────────────────
        {
            kind: "category",
            name: "🔘 GPIO 输入",
            colour: "#A6745C",
            contents: [
                { kind: "block", type: "rpi_button_create" },
                { kind: "block", type: "rpi_button_is_pressed" },
                { kind: "block", type: "rpi_button_value" },
                {
                    kind: "block",
                    type: "rpi_button_wait_press",
                    inputs: { TIMEOUT: { block: { type: "math_number", fields: { NUM: 5 } } } },
                },
                { kind: "separator" },
                { kind: "block", type: "rpi_digital_input_create" },
                { kind: "block", type: "rpi_digital_input_value" },
                { kind: "separator" },
                { kind: "block", type: "rpi_ultrasonic_create" },
                { kind: "block", type: "rpi_ultrasonic_distance" },
                { kind: "block", type: "rpi_ultrasonic_distance_cm" },
            ],
        },

        // ─── PWM / 舵机 / 电机 ────────────────────────────
        {
            kind: "category",
            name: "⚡ PWM / 舵机 / 电机",
            colour: "#5C68A6",
            contents: [
                { kind: "block", type: "rpi_servo_create" },
                {
                    kind: "block",
                    type: "rpi_servo_angle",
                    inputs: { ANGLE: { block: { type: "math_number", fields: { NUM: 0 } } } },
                },
                { kind: "block", type: "rpi_servo_read_angle" },
                { kind: "block", type: "rpi_servo_detach" },
                { kind: "separator" },
                { kind: "block", type: "rpi_motor_create" },
                {
                    kind: "block",
                    type: "rpi_motor_run",
                    inputs: { SPEED: { block: { type: "math_number", fields: { NUM: 0.5 } } } },
                },
                { kind: "block", type: "rpi_motor_stop" },
                { kind: "separator" },
                { kind: "block", type: "rpi_pwm_output_create" },
                {
                    kind: "block",
                    type: "rpi_pwm_value",
                    inputs: { VALUE: { block: { type: "math_number", fields: { NUM: 0.5 } } } },
                },
            ],
        },

        // ─── LED 灯带 ──────────────────────────────────────
        {
            kind: "category",
            name: "🌈 LED 灯带",
            colour: "#A65C81",
            contents: [
                { kind: "block", type: "rpi_neopixel_create" },
                {
                    kind: "block",
                    type: "rpi_neopixel_fill",
                    inputs: {
                        R: { block: { type: "math_number", fields: { NUM: 255 } } },
                        G: { block: { type: "math_number", fields: { NUM: 0 } } },
                        B: { block: { type: "math_number", fields: { NUM: 0 } } },
                    },
                },
                {
                    kind: "block",
                    type: "rpi_neopixel_set_pixel",
                    inputs: {
                        INDEX: { block: { type: "math_number", fields: { NUM: 0 } } },
                        R: { block: { type: "math_number", fields: { NUM: 255 } } },
                        G: { block: { type: "math_number", fields: { NUM: 0 } } },
                        B: { block: { type: "math_number", fields: { NUM: 0 } } },
                    },
                },
                { kind: "block", type: "rpi_color_picker" },
                { kind: "block", type: "rpi_neopixel_show" },
                { kind: "block", type: "rpi_neopixel_clear" },
                {
                    kind: "block",
                    type: "rpi_neopixel_rainbow",
                    inputs: { OFFSET: { block: { type: "math_number", fields: { NUM: 0 } } } },
                },
            ],
        },

        // ─── I2C ──────────────────────────────────────────
        {
            kind: "category",
            name: "🔗 I2C",
            colour: "#81A65C",
            contents: [
                { kind: "block", type: "rpi_i2c_open" },
                {
                    kind: "block",
                    type: "rpi_i2c_write_byte",
                    inputs: {
                        REG: { block: { type: "math_number", fields: { NUM: 0 } } },
                        VAL: { block: { type: "math_number", fields: { NUM: 0 } } },
                    },
                },
                {
                    kind: "block",
                    type: "rpi_i2c_read_byte",
                    inputs: { REG: { block: { type: "math_number", fields: { NUM: 0 } } } },
                },
            ],
        },

        // ─── UART ─────────────────────────────────────────
        {
            kind: "category",
            name: "📡 UART",
            colour: "#A6905C",
            contents: [
                { kind: "block", type: "rpi_uart_open" },
                { kind: "block", type: "rpi_uart_write", inputs: { DATA: { block: { type: "text", fields: { TEXT: "hello" } } } } },
                { kind: "block", type: "rpi_uart_readline" },
                { kind: "block", type: "rpi_uart_available" },
            ],
        },

        // ─── 分隔线 ───────────────────────────────────────
        { kind: "sep" },

        // ─── 基本逻辑 (Blockly 内置) ──────────────────────
        {
            kind: "category",
            name: "🔀 逻辑",
            colour: "#D65C5D",
            contents: [
                { kind: "block", type: "controls_if" },
                { kind: "block", type: "controls_ifelse" },
                { kind: "block", type: "logic_compare" },
                { kind: "block", type: "logic_operation" },
                { kind: "block", type: "logic_negate" },
                { kind: "block", type: "logic_boolean" },
            ],
        },

        // ─── 循环 ─────────────────────────────────────────
        {
            kind: "category",
            name: "🔁 循环",
            colour: "#D65C5D",
            contents: [
                { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { block: { type: "math_number", fields: { NUM: 10 } } } } },
                { kind: "block", type: "controls_whileUntil" },
                { kind: "block", type: "controls_for" },
                { kind: "block", type: "controls_forEach" },
                { kind: "block", type: "controls_flow_statements" },
            ],
        },

        // ─── 数学 ─────────────────────────────────────────
        {
            kind: "category",
            name: "🔢 数学",
            colour: "#5C81A6",
            contents: [
                { kind: "block", type: "math_number" },
                { kind: "block", type: "math_arithmetic" },
                { kind: "block", type: "math_single" },
                { kind: "block", type: "math_trig" },
                { kind: "block", type: "math_constant" },
                { kind: "block", type: "math_number_property" },
                { kind: "block", type: "math_round" },
                { kind: "block", type: "math_random_int" },
                { kind: "block", type: "math_random_float" },
                { kind: "block", type: "math_constrain" },
                { kind: "block", type: "math_modulo" },
            ],
        },

        // ─── 文本 ─────────────────────────────────────────
        {
            kind: "category",
            name: "📝 文本",
            colour: "#5CA6A6",
            contents: [
                { kind: "block", type: "text" },
                { kind: "block", type: "text_join" },
                { kind: "block", type: "text_append" },
                { kind: "block", type: "text_length" },
                { kind: "block", type: "text_indexOf" },
                { kind: "block", type: "text_charAt" },
                { kind: "block", type: "text_getSubstring" },
                { kind: "block", type: "text_changeCase" },
                { kind: "block", type: "text_trim" },
            ],
        },

        // ─── 变量 ─────────────────────────────────────────
        {
            kind: "category",
            name: "📦 变量",
            colour: "#A65C5C",
            custom: "VARIABLE",
        },

        // ─── 函数 ─────────────────────────────────────────
        {
            kind: "category",
            name: "🔧 函数",
            colour: "#9A5CA6",
            custom: "PROCEDURE",
        },
    ],
};
