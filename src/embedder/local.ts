import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Embedder } from './types.js';

export class LocalEmbedder implements Embedder {
  name: string;
  dimensions: number;
  private extractorPromise: Promise<any> | null = null;
  private cacheDir: string;

  constructor(model: string = 'Xenova/all-MiniLM-L6-v2', dimensions: number = 384, customCacheDir?: string) {
    this.name = model;
    this.dimensions = dimensions;
    this.cacheDir = customCacheDir || path.join(os.homedir(), '.cache', 'lore', 'models');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private async getExtractor() {
    if (!this.extractorPromise) {
      this.extractorPromise = (async () => {
        const { pipeline, env } = await import('@xenova/transformers');
        env.cacheDir = this.cacheDir;
        env.allowRemoteModels = true;

        return await pipeline('feature-extraction', this.name, {
          progress_callback: (info: any) => {
            if (info && info.status === 'progress' && info.file) {
              const pct = Math.round(info.progress || 0);
              process.stderr.write(`\r[Lore] Downloading ${info.file} (${pct}%)...`);
            } else if (info && info.status === 'done') {
              process.stderr.write('\r\x1b[K'); // Clear line in terminal
            }
          }
        });
      })();
    }
    return this.extractorPromise;
  }

  private formatText(text: string, isQuery: boolean): string {
    const isE5 = this.name.toLowerCase().includes('e5');
    if (isE5) {
      return isQuery ? `query: ${text}` : `passage: ${text}`;
    }
    return text;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const formatted = texts.map(t => this.formatText(t, false));
    const extractor = await this.getExtractor();

    const output = await extractor(formatted, {
      pooling: 'mean',
      normalize: true
    });

    return output.tolist() as number[][];
  }

  async embedQuery(text: string): Promise<number[]> {
    const formatted = [this.formatText(text, true)];
    const extractor = await this.getExtractor();

    const output = await extractor(formatted, {
      pooling: 'mean',
      normalize: true
    });

    const list = output.tolist() as number[][];
    return list[0];
  }
}
