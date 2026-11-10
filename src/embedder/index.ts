import type { LoreConfig } from '../core/types.js';
import type { Embedder } from './types.js';
import { LocalEmbedder } from './local.js';
import { OpenAIEmbedder, OllamaEmbedder } from './providers.js';

export * from './types.js';
export * from './local.js';
export * from './providers.js';

export function getEmbedder(config: LoreConfig): Embedder {
  switch (config.provider) {
    case 'openai': {
      if (config.openaiApiKey) {
        console.warn('[lore] Warning: "openaiApiKey" found in config file. Prefer the OPENAI_API_KEY environment variable; config files are often committed to git.');
      }
      const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI provider selected but OPENAI_API_KEY is not set.');
      }
      return new OpenAIEmbedder(apiKey, config.model || 'text-embedding-3-small', config.dimensions || 1536);
    }
    case 'ollama': {
      return new OllamaEmbedder(config.model || 'nomic-embed-text', config.ollamaBaseUrl || 'http://127.0.0.1:11434', config.dimensions || 768);
    }
    case 'local':
    default: {
      return new LocalEmbedder(config.model, config.dimensions);
    }
  }
}
