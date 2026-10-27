import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../src/search/math.js';
import { BM25Index, tokenize } from '../src/search/bm25.js';
import { hybridSearch, extractSnippet } from '../src/search/hybrid.js';
import type { DocChunk } from '../src/core/types.js';
import type { Embedder } from '../src/embedder/types.js';

describe('Search & Ranking Engine', () => {
  describe('Cosine Similarity', () => {
    it('should calculate identical vectors as 1.0', () => {
      const v = [0.5, 0.5, 0.5, 0.5];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('should calculate orthogonal vectors as 0.0', () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });

    it('should throw on dimension mismatch', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
    });
  });

  describe('BM25 Lexical Index', () => {
    const sampleChunks: DocChunk[] = [
      {
        id: 'c1',
        filePath: 'auth.md',
        title: 'Authentication Strategy',
        sectionHierarchy: ['Auth'],
        startLine: 1,
        endLine: 10,
        content: 'We use JWT access tokens and Redis for session refresh validation.',
        hash: 'h1',
        metadata: { tags: ['auth', 'jwt'] }
      },
      {
        id: 'c2',
        filePath: 'db.md',
        title: 'Database Architecture',
        sectionHierarchy: ['Database'],
        startLine: 1,
        endLine: 10,
        content: 'PostgreSQL with pgvector for vector storage and transactional consistency.',
        hash: 'h2',
        metadata: { tags: ['db', 'postgres'] }
      }
    ];

    it('should tokenize code terms and normal words', () => {
      const tokens = tokenize('UserAuth-Token jwt_access_key PostgreSQL');
      expect(tokens).toContain('userauth');
      expect(tokens).toContain('token');
      expect(tokens).toContain('jwt_access_key');
      expect(tokens).toContain('postgresql');
    });

    it('should rank exact keyword matches at the top', () => {
      const bm25 = new BM25Index(sampleChunks);
      const results = bm25.score('pgvector database');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunkIndex).toBe(1); // db.md
    });
  });

  describe('Extract Snippet', () => {
    it('should extract snippet surrounding matching terms', () => {
      const content = 'First sentence here. Second sentence has Redis memory caching details. Third sentence is final.';
      const snippet = extractSnippet(content, 'Redis caching');
      expect(snippet.toLowerCase()).toContain('redis');
    });
  });

  describe('Hybrid Search with Mock Embedder', () => {
    const mockEmbedder: Embedder = {
      name: 'mock',
      dimensions: 3,
      async embed(texts) {
        return texts.map(() => [1, 0, 0]);
      },
      async embedQuery(text) {
        return text.includes('redis') ? [1, 0, 0] : [0, 1, 0];
      }
    };

    const chunks: DocChunk[] = [
      {
        id: '1',
        filePath: 'redis.md',
        title: 'Redis Caching',
        sectionHierarchy: ['Cache'],
        startLine: 1,
        endLine: 5,
        content: 'Redis is used for caching session state and queue processing.',
        hash: '1',
        metadata: {},
        embedding: [1, 0, 0]
      },
      {
        id: '2',
        filePath: 's3.md',
        title: 'S3 Storage',
        sectionHierarchy: ['Storage'],
        startLine: 1,
        endLine: 5,
        content: 'MinIO and S3 are used for file uploads and media storage.',
        hash: '2',
        metadata: {},
        embedding: [0, 1, 0]
      }
    ];

    it('should combine vector similarity and lexical ranking', async () => {
      const results = await hybridSearch('redis cache', chunks, mockEmbedder, { topK: 2 });
      expect(results.length).toBe(2);
      expect(results[0].chunk.filePath).toBe('redis.md');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });
});
