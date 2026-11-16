import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { MastraModelGateway } from '@mastra/core/llm';
import type { GatewayLanguageModel, ProviderConfig } from '@mastra/core/llm';
import { z } from 'zod';

const optionSchema = z
  .object({
    level: z.string().min(1),
    target: z.string().min(1),
    supports_thinking_level: z.boolean(),
    supports_thinking_budget: z.boolean(),
    agent_budget_tokens: z.number().int().positive().optional(),
  })
  .refine(option => !option.supports_thinking_budget || option.agent_budget_tokens !== undefined);
const catalogSchema = z
  .object({
    config_version: z.number().int().positive(),
    free_chat_models: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
            display_name: z.string().min(1),
            sort_order: z.number(),
            default_thinking_level: z.string().min(1),
            thinking_options: z.array(optionSchema).min(1),
          })
          .refine(
            model =>
              new Set(model.thinking_options.map(option => option.level)).size === model.thinking_options.length &&
              model.thinking_options.some(option => option.level === model.default_thinking_level),
          ),
      )
      .min(1),
  })
  .refine(catalog => new Set(catalog.free_chat_models.map(model => model.id)).size === catalog.free_chat_models.length);
type Catalog = z.infer<typeof catalogSchema>;

/** Product catalog and call routing share one validated ModelHub snapshot. */
export class ModelHubGateway extends MastraModelGateway {
  readonly id = 'altflow';
  readonly name = 'AltFlow ModelHub';
  #apiKey: string;
  #baseURL: string;
  #snapshot?: Catalog;
  #expires = 0;
  #pending?: Promise<Catalog>;
  constructor(options: { apiKey: string; baseURL?: string }) {
    super();
    const url = new URL(options.baseURL ?? 'https://modelhub.altflow.cn/v1');
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
    ) {
      throw new Error('ModelHub requires HTTPS or an explicit loopback test server');
    }
    if (!options.apiKey) throw new Error('ModelHub credential is not configured');
    this.#apiKey = options.apiKey;
    this.#baseURL = url.href.replace(/\/$/, '');
  }
  handlesModel(id: string) {
    return id.startsWith('altflow/');
  }
  async catalog(): Promise<Catalog> {
    if (this.#snapshot && Date.now() < this.#expires) return this.#snapshot;
    if (this.#pending) return this.#pending;
    this.#pending = (async () => {
      try {
        const response = await fetch(`${this.#baseURL}/model-catalog`, {
          headers: { Authorization: `Bearer ${this.#apiKey}` },
          signal: AbortSignal.timeout(8000),
          redirect: 'error',
        });
        if (!response.ok) throw new Error('ModelHub catalog is unavailable');
        this.#snapshot = catalogSchema.parse(await response.json());
      } catch {
        // Keep the last validated catalog; never substitute the public registry.
        if (!this.#snapshot) throw new Error('ModelHub catalog is unavailable or invalid');
      }
      this.#expires = Date.now() + 60000;
      return this.#snapshot;
    })();
    try {
      return await this.#pending;
    } finally {
      this.#pending = undefined;
    }
  }
  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    const catalog = await this.catalog();
    return {
      altflow: {
        name: this.name,
        gateway: this.id,
        apiKeyEnvVar: 'ALTFLOW_MODELHUB_API_KEY',
        url: this.#baseURL,
        models: [...catalog.free_chat_models]
          .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
          .map(model => model.id),
      },
    };
  }
  async buildUrl() {
    return this.#baseURL;
  }
  async getApiKey() {
    return this.#apiKey;
  }
  async resolveLanguageModel({ modelId }: { modelId: string }): Promise<GatewayLanguageModel> {
    if (!(await this.catalog()).free_chat_models.some(model => model.id === modelId))
      throw new Error('Model is not in the ModelHub product catalog');
    const provider = createOpenAICompatible({
      name: this.id,
      apiKey: this.#apiKey,
      baseURL: this.#baseURL,
      supportsStructuredOutputs: true,
      fetch: async (url, init) => {
        if (String(url) !== `${this.#baseURL}/chat/completions` || typeof init?.body !== 'string') {
          throw new Error('Unsupported ModelHub request');
        }
        // Mastra caches model instances. Refresh here, then freeze one snapshot
        // per HTTP call so catalog changes apply to later generations too.
        const catalog = await this.catalog();
        const product = catalog.free_chat_models.find(model => model.id === modelId);
        const option = product?.thinking_options.find(option => option.level === product.default_thinking_level);
        if (!product || !option) throw new Error('Model is not in the ModelHub product catalog');
        const body = JSON.parse(init.body);
        for (const key of [
          'reasoning_effort',
          'thinking',
          'thinking_budget',
          'thinking_budget_tokens',
          'enable_thinking',
          'modelhub_reasoning_effort',
          'modelhub_thinking_budget',
        ])
          delete body[key];
        body.model = option.target;
        if (option.supports_thinking_level) body.modelhub_reasoning_effort = option.level;
        if (option.supports_thinking_budget) body.modelhub_thinking_budget = option.agent_budget_tokens;
        body.metadata = {
          ...body.metadata,
          source_host: 'mastra-studio',
          modelhub_product_model: product.id,
          modelhub_catalog_version: String(catalog.config_version),
          modelhub_thinking_level: option.level,
        };
        return fetch(url, { ...init, body: JSON.stringify(body), redirect: 'error' });
      },
    });
    return provider.chatModel(modelId);
  }
}
