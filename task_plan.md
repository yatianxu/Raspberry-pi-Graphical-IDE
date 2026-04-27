# Task Plan

## Goal
修复树莓派 SSH 控制台与上传路径逻辑，并处理 Blockly 图片资源被 CSP 拦截的问题。

## Phases
| Phase | Status | Description |
|---|---|---|
| 1 | complete | 审查现有 SSH、设备发现和 CSP 相关实现，确认改动范围 |
| 2 | complete | 修改 Electron 与前端连接面板，移除 `robex` 相关字段/依赖，固定上传路径并改善控制台输出体验 |
| 3 | complete | 调整 CSP 或资源加载方式，消除 Blockly 图片拦截 |
| 4 | complete | 更新文档并执行验证 |

## Decisions
- 上传目标路径改为固定值 `/home/wiz/carbot/main.py`。
- 优先保持现有 UI 结构，只收敛不必要的文件名输入和 `robex` 发现字段依赖。

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `sshUploadScript` 中引用了未定义的 `progressChannel` | 1 | 改为在 preload 内部生成上传进度通道并在完成后移除监听 |
| `npm run build` 输出大体积 chunk 警告 | 1 | 确认构建成功，此警告保留为后续优化项，不影响本次功能交付 |
