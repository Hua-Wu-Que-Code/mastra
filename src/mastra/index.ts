import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { Knowledge, knowledgeMemoryScopes } from '@mastra/core/knowledge';
import { MastraCompositeStore } from '@mastra/core/storage';
import { createTool } from '@mastra/core/tools';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { LocalFilesystem, Workspace } from '@mastra/core/workspace';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { MCPServer } from '@mastra/mcp';
import { Memory } from '@mastra/memory';
import { Observability, MastraStorageExporter } from '@mastra/observability';
import { KNOWLEDGE_ROUTES } from '@mastra/server/server-adapter';
import { resolve } from 'node:path';
import { z } from 'zod';
import { localEmbedder } from './embedding';
import { createAltFlowAuth } from './altflow-auth';
import { ModelHubGateway } from './modelhub-gateway';
import { ContextCompaction } from './context-compaction';

const previewPath = (...parts: string[]) => resolve(process.env.MASTRA_PREVIEW_ROOT ?? process.cwd(), ...parts);
const accounts = createAltFlowAuth({
  backendUrl: process.env.ALTFLOW_BACKEND_URL ?? 'http://127.0.0.1:8080',
  origins: (
    process.env.STUDIO_ALLOWED_ORIGINS ??
    'http://127.0.0.1:5174,http://127.0.0.1:4111,http://localhost:5174,http://localhost:4111'
  )
    .split(',')
    .map(value => value.trim()),
  secureCookies: process.env.NODE_ENV === 'production',
  legacyOwnerId: process.env.ALTFLOW_LEGACY_OWNER_ID,
});
const apiKey = process.env.ALTFLOW_MODELHUB_API_KEY;
if (!apiKey) throw new Error('AltFlow gateway credential is not configured');
const modelHub = new ModelHubGateway({ apiKey, baseURL: process.env.ALTFLOW_MODELHUB_BASE_URL });
// This deployment exposes only its registered ModelHub gateway.
process.env.AUTO_BLOCK_EXTERNAL_PROVIDERS = 'true';
const model = 'altflow/deepseek-v4-pro';
const storage = new MastraCompositeStore({
  id: 'creator-preview-storage',
  default: new LibSQLStore({ id: 'preview-storage', url: `file:${previewPath('src/mastra/public/preview.db')}` }),
  domains: {
    observability: new DuckDBStore({ path: previewPath('data/observability.duckdb'), memoryLimit: '256MB', threads: 2 })
      .observability,
  },
});
const vector = new LibSQLVector({ id: 'creator-vectors', url: `file:${previewPath('data/vectors.db')}` });
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
const creatorAgent = new Agent({
  id: 'creator-agent',
  name: '创作者助手',
  instructions:
    '你是面向创作者的通用智能体。默认用中文交流。根据用户目标自主拆解任务，协助构思、写作、改稿和分析。精确字数调用 countText，篇幅检查可调用工作流。可在创作工作区读写稿件，按需读取技能和检索知识库；只把用户明确提供的偏好、设定和进度写入记忆。工作区之外的文件和联网权限未提供，不要声称拥有。不要编造工具结果。',
  model,
  defaultOptions: { requireToolApproval: false },
  workspace: ({ user }) => (user?.role === 'admin' ? workspace : undefined),
  knowledge,
  // Server auth supplies library access; do not grant every caller ownership.
  scopes: ({ scopes }) => scopes,
  memory: new Memory({
    storage,
    vector,
    embedder: localEmbedder,
    options: {
      // The durable checkpoint projects history at the provider boundary. A second
      // history limiter/OM projection would erase the prefix the checkpoint represents.
      lastMessages: Number.MAX_SAFE_INTEGER,
      semanticRecall: false,
      workingMemory: {
        enabled: true,
        scope: 'resource',
        template: '# 作者偏好\n\n# 当前作品\n\n# 人物与世界观\n\n# 已确认的约束\n\n# 创作进度\n',
      },
      generateTitle: { instructions: '根据首条用户消息生成简洁的中文对话标题，不超过 12 个汉字，只输出标题。' },
    },
  }),
  inputProcessors: [contextCompaction],
  outputProcessors: [contextCompaction],
  errorProcessors: [contextCompaction],
  tools: { countText },
  workflows: { textReview },
});
const creatorMcp = new MCPServer({ id: 'creator-mcp', name: '创作工具服务', version: '1.0.0', tools: { countText } });
export const mastra = new Mastra({
  gateways: { altflow: modelHub },
  agents: { creatorAgent },
  workflows: { textReview },
  tools: { countText },
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
    apiRoutes: [...accounts.apiRoutes, ...KNOWLEDGE_ROUTES],
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
