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

选择器展示产品模型 ID；实际调用由服务端根据目录转换为 `target` 和默认思考档位，并记录目录版本。默认 `altflow/deepseek-v4-pro`，观察记忆也使用它。目录缓存 60 秒，刷新失败保留上次有效目录；首次获取失败时不提供公共模型作为替代。这里沿用 DSH 的目录和路由规则，暂不提供其独立思考档位选择器。

## 权限与数据

- `admin` 角色显示管理入口；`creator`、旧 `user` 角色只能对话及读取获授权的知识。每次 API 请求向 Go 校验身份，角色变更、停用、退出立即生效。
- Cookie 使用 HttpOnly、SameSite=Lax；生产环境附加 Secure。写请求校验 Origin，远程认证服务必须 HTTPS。前端隐藏入口之外，服务端也检查权限及配置覆盖。
- 会话、消息、工作记忆、观察记忆、私人知识按 Go 用户 ID 隔离，管理员也不能读取其他用户的这些私人数据。
- `library:creator` 是共享创作资料，管理员维护、普通用户读取。管理员的文件工作区、工作流记录和全局追踪/日志属于管理资源，**不是按账号隔离的私人空间**。正式多租户场景需另行拆分这些资源。
- `ALTFLOW_LEGACY_OWNER_ID` 可将接入账号前的本地会话明确归属给一个用户，默认不映射。

## 能力和持久化

默认开启观察记忆、语义召回、工作记忆和中文标题。观察记忆将较早消息压缩成观察摘要；观察与反思会产生模型调用。字符统计工具、篇幅检查工作流、知识库、编辑器、MCP、文件工作区及可观测性保留给管理员。

`workspace/` 是本机文件区，初始为空。自定义稿件和技能按需放入，不随源码提交。首次启动创建共享创作指南，不覆盖已有资料。语义向量使用本地多语言 MiniLM（384 维），首次下载约 144 MB，缓存到 `.cache/embeddings/`。

`src/mastra/public/preview.db` 保存会话、知识、工作流和编辑器配置；`data/vectors.db` 保存向量，`data/observability.duckdb` 保存追踪等数据。数据库、环境文件、缓存、工作区都不纳入 Git，部署时须单独持久化和备份。

## 验证

- `npm run typecheck`：配置与适配器类型。
- `npm test`：真实 AI SDK 通过本地 HTTP ModelHub 测试服务验证目录校验、模型路由、默认思考参数、刷新与故障缓存；不调用付费模型。
- 设置 `TEST_STUDIO_DATABASE_URL` 后运行 `npm run verify`：真实 Go 密码验证、临时 Mastra 实例及独立账号，验证角色、跨用户隔离、私有知识、目录过滤、停用、角色变更和退出。
- 测试库名必须以 `studio_auth_verify_` 开头，并预先人工准备与 Go 相同的 schema。测试不自动迁移，不使用正常业务库。
- `TEST_STUDIO_LIVE_MODEL=1 npm run verify` 使用真实 ModelHub 目录及模型，验证回复和消息保存，会产生模型费用。默认验证使用本地 HTTP 目录服务。
