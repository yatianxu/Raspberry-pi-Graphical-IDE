# Task Plan

## Goal
修复 Raspberry Pi IDE 中 SSH 控制台日志出现控制字符“乱码”的问题，并处理 `gpiozero` 在 PWM/舵机场景下输出的 `PWMSoftwareFallback` 警告，使用户日志更清晰、行为更可预期。

## Phases
| Phase | Status | Description |
|---|---|---|
| 1 | complete | 审查 SSH 终端输出链路、日志渲染方式和 PWM 代码生成逻辑，确认根因与改动范围 |
| 2 | complete | 修改 Electron / 前端日志处理，清理 ANSI 控制序列并减少交互式 shell 噪声 |
| 3 | complete | 调整 PWM 相关 Python 生成逻辑，降低或显式抑制 `PWMSoftwareFallback` 警告 |
| 4 | complete | 验证构建结果并更新说明 |

## Decisions
- 优先保留现有内置控制台 UI，不引入完整终端模拟器依赖。
- 对 SSH 输出做“纯文本控制台”清洗，目标是可读性优先，不保留 ANSI 颜色。
- PWM 警告优先通过生成代码中的 `warnings` 过滤来抑制，避免要求用户立刻安装 `pigpio` 才能使用现有积木。

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `npm run build` 仍提示产物 chunk 偏大 | 1 | 构建成功，保留为既有性能优化项，不影响本次修复交付 |
