import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VectorStorage } from '../src/storage/index.js';
import { DEFAULT_CONFIG } from '../src/core/config.js';
import type { DocChunk } from '../src/core/types.js';

const sampleChunks: DocChunk[] = [
  {
    id: 'a.md#L1-L3',
    filePath: 'a.md',
    title: 'A',
    sectionHierarchy: [],
    startLine: 1,
    endLine: 3,
    content: 'Alpha content',
    hash: 'h1',
    metadata: {},
    embedding: [0.1, 0.2, 0.3]
  }
];

describe('VectorStorage', () => {
  let tmpDir: string;
  let storage: VectorStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lore-storage-'));
    storage = new VectorStorage(DEFAULT_CONFIG, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should round-trip a manifest through save and load', () => {
    storage.save(sampleChunks, 'test-model', 3, 1);
    const loaded = storage.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.model).toBe('test-model');
    expect(loaded?.chunkCount).toBe(1);
    expect(loaded?.chunks[0].embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it('should write compact JSON instead of pretty-printing embeddings line by line', () => {
    storage.save(sampleChunks, 'test-model', 3, 1);
    const raw = fs.readFileSync(path.join(tmpDir, '.lore', 'index.json'), 'utf8');
    expect(raw.split('\n').length).toBe(1);
  });

  it('should preserve createdAt across subsequent saves', () => {
    storage.save(sampleChunks, 'test-model', 3, 1);

    // Simulate an older index written in the past
    const indexPath = path.join(tmpDir, '.lore', 'index.json');
    const manifest = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    manifest.createdAt = '2020-01-01T00:00:00.000Z';
    fs.writeFileSync(indexPath, JSON.stringify(manifest), 'utf8');

    const freshStorage = new VectorStorage(DEFAULT_CONFIG, tmpDir);
    const saved = freshStorage.save(sampleChunks, 'test-model', 3, 1);
    expect(saved.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('should report stats and clear the index', () => {
    storage.save(sampleChunks, 'test-model', 3, 1);
    expect(storage.getStats().exists).toBe(true);
    expect(storage.getStats().chunkCount).toBe(1);

    storage.clear();
    expect(storage.exists()).toBe(false);
    expect(storage.load()).toBeNull();
  });
});
