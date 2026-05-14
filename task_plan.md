# Task Plan

## Goal
更新项目文档与 `README.md`，同步最近已实现的功能，包括 Python 代码可编辑覆盖、`pigpio` 后端与 `close()` 积木、连接信息持久化、终端命令历史，以及 SSH renderer 销毁后的稳定性修复。

## Phases
| Phase | Status | Description |
|---|---|---|
| 1 | complete | 盘点仓库中的现有文档与代码差异，确认 README 需要补充的功能点 |
| 2 | complete | 更新 README 的功能特性、连接面板说明、环境配置与排障内容 |
| 3 | complete | 同步 `findings.md` 与 `progress.md`，记录文档更新范围与结论 |
| 4 | complete | 复核文档内容与当前实现是否一致 |

## Decisions
- 文档以 `README.md` 为主，不新增单独的 docs 目录。
- 说明要覆盖“当前行为”，而不是仅描述最初设计目标。
- 对连接信息本地持久化和终端历史仅说明用户可见行为，不暴露实现细节以外的低价值噪声。

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| 暂无 | - | - |
