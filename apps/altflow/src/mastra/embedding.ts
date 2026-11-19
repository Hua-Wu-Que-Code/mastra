import { resolve } from 'node:path';
import { pipeline, env } from '@huggingface/transformers';
import type { MastraEmbeddingModel } from '@mastra/core/vector';

env.cacheDir = resolve(
  process.env.ALTFLOW_RUNTIME_ROOT ?? process.env.MASTRA_PREVIEW_ROOT ?? process.cwd(),
  '.cache/embeddings',
);
const loadExtractor = () =>
  pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
    dtype: 'q8',
    device: 'cpu',
  });
let extractor: ReturnType<typeof loadExtractor> | undefined;

/** Real, local 384-dimensional multilingual sentence embeddings. */
export const localEmbedder = {
  specificationVersion: 'v2',
  provider: 'local-transformers',
  modelId: 'paraphrase-multilingual-MiniLM-L12-v2',
  maxEmbeddingsPerCall: 16,
  supportsParallelCalls: false,
  async doEmbed({ values, abortSignal }: { values: string[]; abortSignal?: AbortSignal }) {
    abortSignal?.throwIfAborted();
    extractor ??= loadExtractor().catch(error => {
      extractor = undefined;
      throw error;
    });
    const model = await extractor;
    const embeddings: number[][] = [];
    for (const value of values) {
      abortSignal?.throwIfAborted();
      const output = await model(value, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data, Number));
    }
    return { embeddings };
  },
} satisfies MastraEmbeddingModel<string>;
