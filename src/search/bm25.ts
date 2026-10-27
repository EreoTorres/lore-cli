import type { DocChunk } from '../core/types.js';

export function tokenize(text: string): string[] {
  // Tokenize words, symbols, and camelCase / snake_case
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(token => token.length > 1);
}

export class BM25Index {
  private docLengths: number[] = [];
  private avgDocLength = 0;
  private docFrequencies: Map<string, number> = new Map();
  private termFrequencies: Map<string, number>[] = [];
  private chunks: DocChunk[] = [];
  private k1: number;
  private b: number;

  constructor(chunks: DocChunk[], k1: number = 1.2, b: number = 0.75) {
    this.chunks = chunks;
    this.k1 = k1;
    this.b = b;
    this.build();
  }

  private build(): void {
    let totalLength = 0;

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const tokens = tokenize(`${chunk.title} ${chunk.content} ${(chunk.metadata.tags || []).join(' ')}`);
      const length = tokens.length;
      this.docLengths.push(length);
      totalLength += length;

      const tf = new Map<string, number>();
      const seenTerms = new Set<string>();

      for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
        seenTerms.add(token);
      }

      for (const term of seenTerms) {
        this.docFrequencies.set(term, (this.docFrequencies.get(term) || 0) + 1);
      }

      this.termFrequencies.push(tf);
    }

    this.avgDocLength = this.chunks.length > 0 ? totalLength / this.chunks.length : 0;
  }

  score(query: string, topK: number = 10): { chunkIndex: number; score: number }[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.chunks.length === 0) return [];

    const scores: { chunkIndex: number; score: number }[] = [];
    const N = this.chunks.length;

    for (let i = 0; i < N; i++) {
      let docScore = 0;
      const docLength = this.docLengths[i];
      const tf = this.termFrequencies[i];

      for (const token of queryTokens) {
        const count = tf.get(token) || 0;
        if (count === 0) continue;

        const df = this.docFrequencies.get(token) || 0;
        // IDF with smoothing
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        const numerator = count * (this.k1 + 1);
        const denominator = count + this.k1 * (1 - this.b + this.b * (docLength / (this.avgDocLength || 1)));

        docScore += idf * (numerator / denominator);
      }

      if (docScore > 0) {
        scores.push({ chunkIndex: i, score: docScore });
      }
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
