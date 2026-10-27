import fs from 'node:fs';
import path from 'node:path';
import type { DocChunk, IndexManifest, LoreConfig } from '../core/types.js';

export class VectorStorage {
  private indexPath: string;
  private storageDir: string;

  constructor(config: LoreConfig, cwd: string = process.cwd()) {
    this.storageDir = path.resolve(cwd, config.storageDir);
    this.indexPath = path.join(this.storageDir, 'index.json');
  }

  exists(): boolean {
    return fs.existsSync(this.indexPath);
  }

  load(): IndexManifest | null {
    if (!this.exists()) return null;
    try {
      const data = fs.readFileSync(this.indexPath, 'utf8');
      return JSON.parse(data) as IndexManifest;
    } catch (err) {
      console.error(`Error loading vector index from ${this.indexPath}:`, err);
      return null;
    }
  }

  save(chunks: DocChunk[], model: string, dimensions: number, fileCount: number): IndexManifest {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    const manifest: IndexManifest = {
      version: '1.0.0',
      model,
      dimensions,
      createdAt: this.load()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount,
      chunkCount: chunks.length,
      chunks
    };

    const tmpPath = `${this.indexPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.indexPath);

    return manifest;
  }

  getStats() {
    if (!this.exists()) {
      return { exists: false, chunkCount: 0, fileCount: 0, sizeKb: 0, updatedAt: null, model: null };
    }

    const stat = fs.statSync(this.indexPath);
    const manifest = this.load();

    return {
      exists: true,
      chunkCount: manifest?.chunkCount || 0,
      fileCount: manifest?.fileCount || 0,
      sizeKb: Math.round(stat.size / 1024),
      updatedAt: manifest?.updatedAt || null,
      model: manifest?.model || null
    };
  }

  clear(): void {
    if (this.exists()) {
      fs.unlinkSync(this.indexPath);
    }
  }
}
