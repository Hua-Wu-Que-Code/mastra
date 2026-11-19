import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { LibSQLSessionSearch } from '@mastra/altflow-tools';
import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { Knowledge, knowledgeMemoryScopes } from '@mastra/core/knowledge';
import { MastraCompositeStore } from '@mastra/core/storage';
import { createTool, TaskStateProcessor } from '@mastra/core/tools';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { LocalFilesystem, Workspace } from '@mastra/core/workspace';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { MCPServer } from '@mastra/mcp';
import { Observability, MastraStorageExporter } from '@mastra/observability';
import { KNOWLEDGE_ROUTES } from '@mastra/server/server-adapter';
import OSS from 'ali-oss';
import { z } from 'zod';
import { DisabledRecallMemory } from './agents/disabled-recall-memory';
import { executionPolicy } from './agents/execution-policy';
import { HistoryMemory } from './agents/history-memory';
import { createPrivateWorkspace } from './agents/private-workspace';
import { createAltFlowAuth } from './altflow-auth';
import { ContextCompaction } from './context-compaction';
import { CONTEXT_MEMORY_OPTIONS } from './context-memory';
import { localEmbedder } from './embedding';
import { conversationModels, defaultConversationModel, defaultReasoningLevel } from './model-policy';
import { ModelHubGateway } from './modelhub-gateway';
import { accountPreferenceRoutes } from './routes/account-preferences';
import { conversationProjectRoutes } from './routes/conversation-projects';
import { conversationStatusRoute } from './routes/conversation-status';
import { subagentRoutes } from './routes/subagents';
import { toolCatalogRoute } from './routes/tool-catalog';
import { accountMemory } from './services/account-memory';
import { AccountPreferences } from './services/account-preferences';
import { ConversationProjects } from './services/conversation-projects';
import { UserDeliveryService } from './services/delivery';
import { OfficeReader } from './services/office';
import { createAgentTree } from './subagents/agents';
import { SubagentStore } from './subagents/store';
import { createCreatorTools } from './tools';
import { createDocumentTools } from './tools/read-document';
import { UserStorage } from './user-storage';
import { userStorageRoutes } from './user-storage-routes';

const previewPath = (...parts: string[]) =>
  resolve(process.env.ALTFLOW_RUNTIME_ROOT ?? process.env.MASTRA_PREVIEW_ROOT ?? process.cwd(), ...parts);
const accountsOrigins = (
  process.env.STUDIO_ALLOWED_ORIGINS ??
  'http://127.0.0.1:5174,http://127.0.0.1:4111,http://localhost:5174,http://localhost:4111'
)
  .split(',')
  .map(value => value.trim());
const accounts = createAltFlowAuth({
  backendUrl: process.env.ALTFLOW_BACKEND_URL ?? 'http://127.0.0.1:8080',
  origins: accountsOrigins,
  secureCookies: process.env.NODE_ENV === 'production',
  legacyOwnerId: process.env.ALTFLOW_LEGACY_OWNER_ID,
});
const apiKey = process.env.ALTFLOW_MODELHUB_API_KEY;
if (!apiKey) throw new Error('AltFlow gateway credential is not configured');
const modelHub = new ModelHubGateway({
  apiKey,
  baseURL: process.env.ALTFLOW_MODELHUB_BASE_URL,
  allowedModels: conversationModels,
  defaultReasoningLevel,
});
// This deployment exposes only its registered ModelHub gateway.
process.env.AUTO_BLOCK_EXTERNAL_PROVIDERS = 'true';
const model = defaultConversationModel;
// Fresh checkouts have no ignored database directories yet. Create them before opening stores.
await mkdir(previewPath('src/mastra/public'), { recursive: true });
await mkdir(previewPath('data'), { recursive: true });
const storage = new MastraCompositeStore({
  id: 'creator-preview-storage',
  default: new LibSQLStore({ id: 'preview-storage', url: `file:${previewPath('src/mastra/public/preview.db')}` }),
  domains: {
    observability: new DuckDBStore({ path: previewPath('data/observability.duckdb'), memoryLimit: '256MB', threads: 2 })
      .observability,
  },
});
const projectMemory = await storage.getStore('memory');
if (!projectMemory) throw new Error('Conversation storage is unavailable');
await mkdir(previewPath('data'), { recursive: true });
const conversationProjects = new ConversationProjects(
  `file:${previewPath('data/conversation-projects.db')}`,
  projectMemory,
);
await conversationProjects.init();
const accountPreferences = new AccountPreferences(`file:${previewPath('data/account-preferences.db')}`, projectMemory);
await accountPreferences.init();
const vector = new LibSQLVector({ id: 'creator-vectors', url: `file:${previewPath('data/vectors.db')}` });
await mkdir(previewPath('data'), { recursive: true });
const ossKey = process.env.ALTFLOW_OSS_ACCESS_KEY_ID;
const ossSecret = process.env.ALTFLOW_OSS_ACCESS_KEY_SECRET;
if (!ossKey || !ossSecret)
  throw new Error('Configure server-only ALTFLOW_OSS_ACCESS_KEY_ID and ALTFLOW_OSS_ACCESS_KEY_SECRET');
const userFiles = new UserStorage({
  client: new OSS({
    accessKeyId: ossKey,
    accessKeySecret: ossSecret,
    region: process.env.ALTFLOW_OSS_REGION ?? 'oss-cn-beijing',
    bucket: process.env.ALTFLOW_OSS_BUCKET ?? 'altflow-harness',
    endpoint: process.env.ALTFLOW_OSS_ENDPOINT ?? 'https://oss-cn-beijing.aliyuncs.com',
    authorizationV4: true,
    timeout: 30000,
  }),
  databaseUrl: process.env.ALTFLOW_FILES_DATABASE_URL ?? `file:${previewPath('data/user-files.db')}`,
  authToken: process.env.ALTFLOW_FILES_DATABASE_AUTH_TOKEN,
});
await userFiles.init();
const recoveryTimer = setInterval(() => void userFiles.recover().catch(() => {}), 10 * 60_000);
recoveryTimer.unref();
const workspace = new Workspace({
  id: 'creator-workspace',
  name: '创作工作区',
  filesystem: new LocalFilesystem({ basePath: previewPath('workspace') }),
  bm25: true,
  vectorStore: vector,
  embedder: async (text: string) => (await localEmbedder.doEmbed({ values: [text] })).embeddings[0],
  skills: ['skills'],
});
const knowledge = new Knowledge({
  id: 'creator-knowledge',
  name: '创作知识库',
  description: '创作方法、素材和作者偏好。',
  storage,
  vector,
  embedder: localEmbedder,
  tools: true,
  pinnedContext: true,
  scopes: {
    ...knowledgeMemoryScopes({ org: false }),
    'audience:$audience': { displayLabel: '创作者', access: [{ principal: 'self', role: 'viewer' }] },
    'library:$libraryId': {
      displayLabel: '创作资料',
      description: '管理员维护的共享创作方法库。',
      access: [
        { principal: 'self', role: 'owner' },
        { principal: 'audience:creators', role: 'viewer' },
      ],
    },
  },
});
const textStatsSchema = z.object({ characters: z.number(), nonWhitespace: z.number(), paragraphs: z.number() });
const countText = createTool({
  id: 'count-text',
  description: '统计创作文本的字符数、非空白字符数和段落数。',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: textStatsSchema,
  execute: async ({ text }) => ({
    characters: [...text].length,
    nonWhitespace: [...text.replace(/\s/gu, '')].length,
    paragraphs: text.split(/\n\s*\n/).filter(part => part.trim()).length,
  }),
});
const analyzeText = createStep({
  id: 'analyze-text',
  description: '整理文本并统计篇幅。',
  inputSchema: z.object({ text: z.string().min(1), targetCharacters: z.number().int().positive().optional() }),
  outputSchema: textStatsSchema.extend({ text: z.string(), targetCharacters: z.number().optional() }),
  execute: async ({ inputData }) => {
    const text = inputData.text.replace(/\r\n/g, '\n').trim();
    return {
      ...inputData,
      text,
      characters: [...text].length,
      nonWhitespace: [...text.replace(/\s/gu, '')].length,
      paragraphs: text.split(/\n\s*\n/).filter(part => part.trim()).length,
    };
  },
});
const reportSchema = z.object({ report: z.string(), characters: z.number(), difference: z.number().nullable() });
const composeReport = createStep({
  id: 'compose-report',
  description: '生成中文篇幅检查报告。',
  inputSchema: analyzeText.outputSchema,
  outputSchema: reportSchema,
  execute: async ({ inputData }) => ({
    characters: inputData.characters,
    difference: inputData.targetCharacters === undefined ? null : inputData.characters - inputData.targetCharacters,
    report: `共 ${inputData.characters} 字符，去除空白后 ${inputData.nonWhitespace} 字符，${inputData.paragraphs} 段。${inputData.targetCharacters === undefined ? '' : `目标 ${inputData.targetCharacters} 字符，差额 ${inputData.characters - inputData.targetCharacters}。`}`,
  }),
});
const textReview = createWorkflow({
  id: 'text-review',
  description: '文本篇幅检查：整理文本、统计篇幅、对比目标并生成报告。',
  inputSchema: analyzeText.inputSchema,
  outputSchema: reportSchema,
})
  .then(analyzeText)
  .then(composeReport)
  .commit();
const contextCompaction = new ContextCompaction({ gateway: modelHub, storage });
const creatorMemory = new HistoryMemory({
  storage,
  vector,
  embedder: localEmbedder,
  options: {
    ...CONTEXT_MEMORY_OPTIONS,
    semanticRecall: true,
    workingMemory: {
      enabled: true,
      scope: 'resource',
      template: '# 作者偏好\n\n# 当前作品\n\n# 人物与世界观\n\n# 已确认的约束\n\n# 创作进度\n',
    },
    generateTitle: { instructions: '根据首条用户消息生成简洁的中文对话标题，不超过 12 个汉字，只输出标题。' },
  },
});
const disabledRecallMemory = new DisabledRecallMemory({ storage, options: { generateTitle: true } });
const sessionClient = createClient({ url: `file:${previewPath('src/mastra/public/preview.db')}` });
const documents = createDocumentTools(new OfficeReader(userFiles));
const creatorToolBundle = createCreatorTools({
  countText,
  sessionSearch: new LibSQLSessionSearch(sessionClient),
  delivery: new UserDeliveryService(userFiles),
});
const privateWorkspace = createPrivateWorkspace(userFiles, previewPath('workspace/skills'));
const subagentStore = new SubagentStore(`file:${previewPath('data/subagents.db')}`);
await subagentStore.init();
const childMemory = new HistoryMemory({
  storage,
  options: {
    ...CONTEXT_MEMORY_OPTIONS,
    semanticRecall: false,
    workingMemory: { enabled: false },
    generateTitle: false,
  },
});
const agentTree = createAgentTree({
  store: subagentStore,
  memory: projectMemory,
  childMemory,
  model,
  tools: { ...creatorToolBundle.tools, ...documents.tools },
  getMastra: () => mastra,
  getRootAgent: () => creatorAgent,
  teamEnabled: async actor => {
    const preferences = await accountPreferences.read(actor.owner, actor.resourceId, {
      kind: 'thread',
      id: JSON.stringify(['creator-agent', actor.root]),
    });
    return (
      z.object({ modelSettings: z.object({ teamwork: z.boolean().optional() }).optional() }).parse(preferences.value)
        .modelSettings?.teamwork === true
    );
  },
  childConfig: {
    inputProcessors: [contextCompaction, documents.processor],
    outputProcessors: [contextCompaction],
    errorProcessors: [contextCompaction],
    workspace: ({ user }) => (user?.id ? privateWorkspace(user.id) : undefined),
    knowledge,
    scopes: ({ scopes }) => scopes,
  },
});
const creatorTools = { ...creatorToolBundle.tools, ...documents.tools, ...agentTree.tools };
const creatorAgent = new Agent({
  id: 'creator-agent',
  name: '创作者助手',
  instructions:
    '你是面向创作者的通用智能体。默认用中文交流。根据用户目标自主拆解任务，协助构思、写作、改稿和分析。精确字数调用 countText，篇幅检查可调用工作流。可在创作工作区读写稿件，按需读取技能和检索知识库；只把用户明确提供的偏好、设定和进度写入记忆。可按需使用 web_fetch 读取公开网页；web_search 仅在配置后可用。先检索事实再给引用，不声称执行未提供的工具。复杂任务维护 task 清单；需要用户选择时 ask_user；需要审批时写入 .mastracode/plans/*.md 后 submit_plan。历史设定用 session_search 字面检索，再用 recall 读取原文。可用 subagent 动态创建后台助手，用 subagent_fork 分叉已完成的上下文，用 send_message、wait_agent、list_agents、interrupt_agent 协作。团队开关只控制共享任务板和团队协作指令，普通子智能体独立可用。不要编造工具结果。用户附件已保存在本人工作区，应按附件提供的路径调用文件工具读取，Office 和 PDF 正文调用 read_document（使用 DSH LibreOffice Kit），不要依据旧记忆声称无法读取；生成的文件也写入该工作区。写入成功后调用 present 交付文件，不编造文件路径。面向用户只展示文件名，用 present 的文件卡片或下载链接交付，不在正文中展示工作区目录、内部存储路径或工具使用的路径。',
  model,
  defaultOptions: {
    requireToolApproval: false,
    ...executionPolicy().loop,
    providerOptions: { altflow: { reasoningLevel: defaultReasoningLevel } },
  },
  workspace: ({ user }) => (user?.id ? privateWorkspace(user.id) : undefined),
  knowledge,
  // Server auth supplies library access; do not grant every caller ownership.
  scopes: ({ scopes }) => scopes,
  memory: accountMemory(accountPreferences, creatorMemory, disabledRecallMemory),
  inputProcessors: [new TaskStateProcessor(), contextCompaction, agentTree.processor, documents.processor],
  outputProcessors: [contextCompaction],
  errorProcessors: [contextCompaction],
  tools: creatorTools,
  workflows: { textReview },
});
const creatorMcp = new MCPServer({ id: 'creator-mcp', name: '创作工具服务', version: '1.0.0', tools: { countText } });
export const mastra = new Mastra({
  // Keep workspace packages intact so pnpm resolves each package's own dependencies.
  bundler: {
    externals: [
      '@mastra/altflow-tools',
      '@deepseek-ai/libreoffice-kit',
      'pdfjs-dist',
      '@mastra/core',
      '@mastra/duckdb',
      '@mastra/editor',
      '@mastra/libsql',
      '@mastra/mcp',
      '@mastra/memory',
      '@mastra/observability',
      '@mastra/server',
    ],
  },
  gateways: { altflow: modelHub },
  agents: { creatorAgent },
  workflows: { textReview },
  tools: creatorTools,
  processors: { contextCompaction },
  workspace,
  knowledge: { creatorKnowledge: knowledge },
  vectors: { creatorVectors: vector },
  mcpServers: { creatorMcp },
  storage,
  editor: new MastraEditor(),
  observability: new Observability({
    configs: {
      default: { serviceName: 'creator-preview', exporters: [new MastraStorageExporter({ maxBatchWaitMs: 500 })] },
    },
  }),
  server: {
    host: '127.0.0.1',
    port: Number(process.env.STUDIO_PORT ?? 4111),
    auth: accounts.auth,
    apiRoutes: [
      ...accounts.apiRoutes,
      conversationStatusRoute(() => creatorAgent, accounts, accountsOrigins),
      ...subagentRoutes(
        agentTree.runtime,
        accounts,
        accountsOrigins,
        () => creatorAgent,
        actor => accountPreferences.conversationOptions(actor.owner, actor.resourceId, 'creator-agent', actor.root),
      ),
      toolCatalogRoute({
        accounts,
        origins: accountsOrigins,
        tools: creatorTools,
        memory: creatorMemory,
        knowledge,
        workspace: privateWorkspace,
        providerConfigured: creatorToolBundle.providerConfigured,
      }),
      ...userStorageRoutes(userFiles, accounts.authenticate, accountsOrigins),
      ...conversationProjectRoutes(conversationProjects, accounts, accountsOrigins),
      ...accountPreferenceRoutes(accountPreferences, accounts, accountsOrigins),
      ...KNOWLEDGE_ROUTES,
    ],
    cors: {
      origin: (
        process.env.STUDIO_ALLOWED_ORIGINS ??
        'http://127.0.0.1:5174,http://127.0.0.1:4111,http://localhost:5174,http://localhost:4111'
      ).split(','),
      credentials: true,
    },
    mcp: { enabled: true },
  },
});

// Seed first-use reference pages without replacing material edited in Studio.
await storage.init();
const knowledgeStore = await storage.getStore('knowledge');
if (!knowledgeStore) throw new Error('Knowledge storage is unavailable');
for (const page of [
  {
    path: 'writing-guide',
    name: '中文创作指南',
    body: '从人物目标、阻力和选择组织情节。每个场景推进人物行动或关系变化。改稿时保留作者意图，先检查动机、因果和设定一致性，再调整语言与节奏。需要精确篇幅时使用字数工具。',
  },
  {
    path: 'workspace-guide',
    name: '工作区使用说明',
    body: '工作区用于保存稿件和可选技能。可以让助手保存、读取、搜索和修改稿件。知识库用于可复用的方法与素材，工作记忆用于作者偏好与已确认的设定。',
  },
]) {
  const [scope] = await knowledgeStore.getScopesByAddress(['library:creator']);
  const existing = scope && (await knowledgeStore.getPageByPath({ scopeId: scope.id, path: [page.path], read: 'all' }));
  if (!existing) await knowledge.upsertPage({ scope: 'library:creator', ...page });
}
await workspace.init();
