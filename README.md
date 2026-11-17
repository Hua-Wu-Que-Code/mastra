# 创作者助手

Go 后端复用 AltFlow 的密码登录、令牌校验、退出和账号角色。TypeScript/Mastra 负责 Agent、模型、会话记忆和知识库。认证接入不依赖 Mastra Enterprise 登录或 RBAC。

## 本地启动

需要 Node.js 24+、Go、PostgreSQL、已配置的 AltFlow 账号库，以及同一套修改后的 Mastra Studio 源码。

1. `npm ci`，复制 `.env.example` 为 `.env`。
2. 配置 `ALTFLOW_BACKEND_REPO` 和 `ALTFLOW_BACKEND_ENV_FILE`，指向含 `cmd/studio-auth` 的 Go 仓库及本地环境文件。
3. 配置 `ALTFLOW_MODELHUB_API_KEY`；或通过 `ALTFLOW_MODELHUB_ENV_FILE` 明确指定含 `LITELLM_MASTER_KEY` 的文件。启动器不会搜索其他目录的密钥。
4. 分别运行 `npm run dev:auth` 和 `npm run dev`，监听 `127.0.0.1:8080` 和 `127.0.0.1:4111`。
5. 在修改后的 Mastra 仓库运行 Studio 的 Vite 开发服务，端口 5174，将 `/api`、`/account` 代理到 4111。

Go 认证入口只用于本地开发，不启动项目任务恢复或业务后台任务，不迁移数据库。正式部署应让 `ALTFLOW_BACKEND_URL` 指向正式 Go 服务，配置 `STUDIO_ALLOWED_ORIGINS`，使用 HTTPS、持久化存储及生产进程入口；这份开发启动脚本不承担部署。

## 模型

只注册 AltFlow ModelHub 网关，隐藏 Mastra 公共模型供应商。目录来自 `https://modelhub.altflow.cn/v1/model-catalog` 的 `free_chat_models`，不使用包含内部路由的 `/v1/models`。

选择器展示目录中的产品名称，点击后可分别切换模型和推理等级。档位来自每个模型的 `thinking_options`，切换模型时使用新模型的默认档位；选择保存在当前会话偏好中。实际调用由服务端验证所选档位，并根据该档位转换为 `target`、思考强度及预算，记录目录版本。默认 `altflow/deepseek-v4-pro`。目录缓存 60 秒，刷新失败保留上次有效目录；首次获取失败时不提供公共模型作为替代。这里沿用 DSH 的目录、档位选择和路由规则。

## 权限与数据

- `admin` 角色显示管理入口；`creator`、旧 `user` 角色只能对话及读取获授权的知识。每次 API 请求向 Go 校验身份，角色变更、停用、退出立即生效。
- Cookie 使用 HttpOnly、SameSite=Lax；生产环境附加 Secure。写请求校验 Origin，远程认证服务必须 HTTPS。前端隐藏入口之外，服务端也检查权限及配置覆盖。
- 会话、消息、工作记忆、观察记忆、私人知识按 Go 用户 ID 隔离，管理员也不能读取其他用户的这些私人数据。
- `library:creator` 是共享创作资料，管理员维护、普通用户读取。管理员的文件工作区、工作流记录和全局追踪/日志属于管理资源，**不是按账号隔离的私人空间**。正式多租户场景需另行拆分这些资源。
- `ALTFLOW_LEGACY_OWNER_ID` 可将接入账号前的本地会话明确归属给一个用户，默认不映射。

## 能力和持久化

默认开启工作记忆、中文标题和 DSH 检查点压缩。Agent 默认无需审批即可执行已提供的工具。字符统计工具、篇幅检查工作流、知识库、编辑器、MCP、文件工作区及可观测性保留给管理员。

### DSH 上下文策略

- 运行窗口采用本机 DSH ModelHub 集成的 `131,072` tokens，主模型输出最多 `8,192`；上游 `/model/info` 给出更小输入容量时取较小值。UI 展示该实际运行窗口，不再把物理 `1M` 容量当作会话预算。
- 每一步模型请求之前重新检查压力。默认阈值为 `min(窗口 × 0.8, 窗口 − 输出预留 − 65,536)`，当前为 `57,344` tokens。保留尾部预算为 `(窗口 − 输出预留) × 0.16`，当前为 `19,660` tokens。
- 先裁剪超过 8,192 个 Unicode 字符的工具文本，保留前 4,096、后 1,024；仍有压力时，用最近回答的模型生成 DSH 原版结构化检查点。工具调用与结果保持配对，当前用户请求始终保留。摘要最多预留 65,536 输出 tokens，并受摘要模型剩余容量约束；摘要不能执行工具。
- 检查点写入所属 thread 的 metadata。原始消息与工具结果保留在数据库；重启后重放检查点及近期原文。取消、空摘要、输出截断、不缩小及并发检查点冲突均不会覆盖历史。确认的上下文溢出仅重试一次，且必须先成功缩小请求。
- 关闭原先的 `48K` 截断器和观察记忆/语义召回投影，避免两套历史压缩互相覆盖；旧观察记录不删除。工作记忆仍独立保存作者偏好。
- 与 DSH 一样，触发压缩的内部压力会使用提供方真实输入用量加后续消息增量；尚无用量时采用固定密度计价。UI 占用只显示提供方实际 input tokens，不把内部压力估算当作实际 token 数。
- “轮”是至少完成一个主模型步骤的用户执行；“步”是已结束的主模型调用。工具执行、标题、压缩和子 Agent 调用不额外算作主 Agent 步数，辅助调用费用仍计入总用量。

`workspace/` 是本机文件区，初始为空。自定义稿件和技能按需放入，不随源码提交。首次启动创建共享创作指南，不覆盖已有资料。语义向量使用本地多语言 MiniLM（384 维），首次下载约 144 MB，缓存到 `.cache/embeddings/`。

`src/mastra/public/preview.db` 保存会话、知识、工作流和编辑器配置；`data/vectors.db` 保存向量，`data/observability.duckdb` 保存追踪等数据。数据库、环境文件、缓存、工作区都不纳入 Git，部署时须单独持久化和备份。

## 验证

- `npm run typecheck`：配置与适配器类型。
- `npm test`：真实 AI SDK 通过本地 HTTP ModelHub 测试服务验证目录校验、模型路由、默认思考参数、刷新与故障缓存，以及真实 Agent + 临时 LibSQL 的压缩、恢复、工具配对、模型切换、取消和溢出重试；不调用付费模型。
- 通用设置中的“繁忙时的发送行为”默认排队发送。Enter 和发送按钮遵循该选项，Cmd/Ctrl+Enter 使用另一行为；可切换为插话发送。普通用户的两种发送方式均由服务端检查会话归属。
- 设置 `TEST_STUDIO_DATABASE_URL` 后运行 `npm run verify`：真实 Go 密码验证、临时 Mastra 实例及独立账号，验证角色、跨用户隔离、私有知识、目录过滤、自动工具执行、繁忙时排队与插话、停用、角色变更和退出。
- 测试库名必须以 `studio_auth_verify_` 开头，并预先人工准备与 Go 相同的 schema。测试不自动迁移，不使用正常业务库。
- `TEST_STUDIO_LIVE_MODEL=1 npm run verify` 使用真实 ModelHub 目录及模型，验证回复和消息保存，会产生模型费用。默认验证使用本地 HTTP 目录服务。
