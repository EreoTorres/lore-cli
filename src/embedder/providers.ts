import type { Embedder } from './types.js';

export class OpenAIEmbedder implements Embedder {
  name: string;
  dimensions: number;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-small', dimensions: number = 1536, baseUrl?: string) {
    this.apiKey = apiKey;
    this.name = model;
    this.dimensions = dimensions;
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.name
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Embedding error (${res.status}): ${err}`);
    }

    const data = await res.json() as { data: { embedding: number[] }[] };
    return data.data.map(d => d.embedding);
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = await this.embed([text]);
    return res[0];
  }
}

export class OllamaEmbedder implements Embedder {
  name: string;
  dimensions: number;
  private baseUrl: string;

  constructor(model: string = 'nomic-embed-text', baseUrl: string = 'http://127.0.0.1:11434', dimensions: number = 768) {
    this.name = model;
    this.dimensions = dimensions;
    this.baseUrl = baseUrl;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.name,
          prompt: text
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama Embedding error (${res.status}) on model ${this.name}`);
      }

      const data = await res.json() as { embedding: number[] };
      results.push(data.embedding);
    }
    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = await this.embed([text]);
    return res[0];
  }
}
