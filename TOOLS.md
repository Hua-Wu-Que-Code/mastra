# 创作者助手工具

同事实现已以 `39c2fab5c6` 合入主工作树 `/Users/huawuque/工作/mastra` 的 `altflow` 分支。运行应用仍位于本目录。

## 能力

显式工具：count-text、web_fetch、ask_user、submit_plan、task_write、task_update、task_complete、task_check、session_search、present。配置搜索凭据后再注册 web_search，共 11 个。另有动态子智能体与团队工具 10 个：subagent、subagent_fork、list_agents、send_message、wait_agent、interrupt_agent、team_task_create/get/list/update；总计 20 个，配置搜索后为 21 个。

工作区文件、知识库、技能、recall、工作流仍使用 Mastra 原生工具。动态子智能体基于原生 Agent/Memory/Signal 运行，调度与持久化由 `subagents/` 管理。`/altflow/tools/catalog` 是鉴权只读目录，显示来源及未配置原因，不提供运行时工具的无会话执行旁路。

没有新增定时任务。当前 recall 提供历史浏览，没有开启观察记忆向量检索。

## 本地安装与验证

package.json 通过相对 file 路径引用主工作树里的 `integrations/altflow-tools`。换机器或移动目录后需要修改该路径；部署时先构建包、打包或发布到私有 registry，再安装产物。

```sh
# 在 Mastra 工作树中构建 @mastra/altflow-tools
pnpm --filter @mastra/altflow-tools build:lib
# 回到本应用，使用复制安装以共用本应用的 Mastra 实例
npm install --install-links
npm run typecheck
npm run test:tools
npm test
```

包源码改变后应先重新构建并更新应用安装的包副本。UI 位于主工作树 `packages/playground` 与 `packages/playground-ui`。

## 搜索配置

默认 provider 为 Tavily，配置服务端 TAVILY_API_KEY。也可以设置 ALTFLOW_SEARCH_PROVIDER=deepseek，另配 DEEPSEEK_SEARCH_API_KEY；可选 TAVILY_SEARCH_URL / DEEPSEEK_SEARCH_URL 均为完整搜索 endpoint。只允许 HTTPS（本地测试地址除外），不跟随重定向。

未配置时模型看不到 web_search，目录显示未配置。不能把 ModelHub 聊天 key 当搜索 key 发给其他服务。

## 委派策略

依据 DSH 源码：`packages/subagent/subagent/src/index.ts` 默认 maxActiveSubagents=8、maxDepth=1；`packages/core/agent-loop/src/constants.ts` 默认并行工具容量 10。8 是活跃容量，不是步数。

`agents/execution-policy.ts` 统一执行容量。ALTFLOW_MAX_ACTIVE_SUBAGENTS、ALTFLOW_MAX_PARALLEL_TOOL_CALLS 可覆盖默认值。Mastra 数字 maxSteps 使用 MAX_SAFE_INTEGER 适配持续执行，不额外设置固定步数预算。

动态助手独立后台运行，完成后通知主智能体；可分叉、发现、消息、等待、打断与继续。团队开关只控制共享任务板。任务、消息和子会话元数据均保存到服务端 LibSQL。详细契约、冷恢复与验证边界见 `DSH-SUBAGENT-HANDOFF.md`。

认证在每次请求覆盖 mastra__altflowAccountResourceId；客户端不能提供 mastra__* 覆盖。子智能体继承账号文件授权，保留树内私有 Memory resourceId；普通侧栏不会列出子会话。

present 只引用现有用户文件，不重复计入 512MB 配额。下载重新校验账号与路径；不信任模型提供的任意下载地址。公共技能来自受 realpath 约束的只读源。

## 验证边界

自动验证使用真实 Agent 循环、SQLite、文件账本、HTTP、提问/审批暂停恢复、动态后台运行；付费模型和 OSS 外部服务边缘用本地协议样本。真实搜索 provider 调用及真实 DeepSeek 搜索引用仍需单独的搜索凭据。
