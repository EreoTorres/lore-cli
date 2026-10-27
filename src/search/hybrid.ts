import type { DocChunk, SearchResult } from '../core/types.js';
import type { Embedder } from '../embedder/types.js';
import { cosineSimilarity } from './math.js';
import { BM25Index, tokenize } from './bm25.js';

export interface HybridSearchOptions {
  topK?: number;
  rrfConstant?: number;
  vectorWeight?: number;
  lexicalWeight?: number;
}

export function extractSnippet(content: string, query: string, maxLength: number = 220): string {
  const clean = content.replace(/^\[Section:[^\]]+\]\s*/, '').trim();
  const queryTokens = tokenize(query);

  if (clean.length <= maxLength) {
    return clean;
  }

  // Find position of the first query token in the text
  let bestPos = -1;
  const lower = clean.toLowerCase();
  for (const token of queryTokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (bestPos === -1 || idx < bestPos)) {
      bestPos = idx;
    }
  }

  if (bestPos === -1) {
    return clean.slice(0, maxLength) + '...';
  }

  const start = Math.max(0, bestPos - 40);
  const end = Math.min(clean.length, start + maxLength);
  let snippet = clean.slice(start, end).trim();

  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';

  return snippet;
}

export async function hybridSearch(
  query: string,
  chunks: DocChunk[],
  embedder: Embedder,
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  const topK = options.topK || 5;
  const k = options.rrfConstant || 60;
  const vectorWeight = options.vectorWeight ?? 0.6;
  const lexicalWeight = options.lexicalWeight ?? 0.4;

  if (chunks.length === 0) return [];

  // 1. Vector Search
  const queryVector = await embedder.embedQuery(query);
  const vectorScores: { index: number; similarity: number }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.embedding && chunk.embedding.length > 0) {
      const sim = cosineSimilarity(queryVector, chunk.embedding);
      vectorScores.push({ index: i, similarity: sim });
    }
  }

  vectorScores.sort((a, b) => b.similarity - a.similarity);

  // 2. Lexical BM25 Search
  const bm25 = new BM25Index(chunks);
  const bm25Results = bm25.score(query, chunks.length);
  const bm25Map = new Map<number, number>();
  for (let rank = 0; rank < bm25Results.length; rank++) {
    bm25Map.set(bm25Results[rank].chunkIndex, rank + 1);
  }

  // 3. Reciprocal Rank Fusion (RRF)
  const vectorRankMap = new Map<number, number>();
  const vectorSimMap = new Map<number, number>();
  for (let rank = 0; rank < vectorScores.length; rank++) {
    vectorRankMap.set(vectorScores[rank].index, rank + 1);
    vectorSimMap.set(vectorScores[rank].index, vectorScores[rank].similarity);
  }

  const mergedScores: { index: number; rrf: number; vectorSim: number; bm25Score: number }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const vRank = vectorRankMap.get(i);
    const lRank = bm25Map.get(i);

    let rrf = 0;
    if (vRank !== undefined) {
      rrf += vectorWeight * (1 / (k + vRank));
    }
    if (lRank !== undefined) {
      rrf += lexicalWeight * (1 / (k + lRank));
    }

    if (rrf > 0) {
      mergedScores.push({
        index: i,
        rrf,
        vectorSim: vectorSimMap.get(i) || 0,
        bm25Score: lRank !== undefined ? 1 / lRank : 0
      });
    }
  }

  mergedScores.sort((a, b) => b.rrf - a.rrf);

  // Normalize RRF scores
  const maxRrf = mergedScores.length > 0 ? mergedScores[0].rrf : 1;

  return mergedScores.slice(0, topK).map(item => {
    const chunk = chunks[item.index];
    const normalizedScore = Number((item.rrf / maxRrf).toFixed(3));
    return {
      chunk,
      score: normalizedScore,
      vectorScore: Number(item.vectorSim.toFixed(3)),
      lexicalScore: Number(item.bm25Score.toFixed(3)),
      snippet: extractSnippet(chunk.content, query)
    };
  });
}
