import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import type { DocChunk } from '../../core/types.js';
import { parseMarkdownFile } from '../../chunker/markdown.js';
import { getEmbedder } from '../../embedder/index.js';
import { VectorStorage } from '../../storage/index.js';

export interface IndexCommandOptions {
  force?: boolean;
  verbose?: boolean;
}

export async function runIndex(options: IndexCommandOptions = {}): Promise<void> {
  const startTime = Date.now();
  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const storage = new VectorStorage(config, cwd);

  console.log(pc.bold(pc.blue('⚡ Lore: Indexing repository memory...')));

  // 1. Scan files (normalize patterns to forward slashes for cross-platform globbing)
  const includePatterns = config.include.map(p => p.replace(/\\/g, '/'));
  const excludePatterns = config.exclude.map(p => p.replace(/\\/g, '/'));

  const filePaths = await fg(includePatterns, {
    cwd,
    ignore: excludePatterns,
    dot: true,
    onlyFiles: true
  });

  if (filePaths.length === 0) {
    console.log(pc.yellow('⚠ No markdown or documentation files found matching patterns:'));
    config.include.forEach(pattern => console.log(`  - ${pattern}`));
    return;
  }

  // 2. Load existing index for incremental caching
  const existingManifest = options.force ? null : storage.load();
  const cachedChunksMap = new Map<string, DocChunk>();
  if (existingManifest) {
    for (const chunk of existingManifest.chunks) {
      if (chunk.hash && chunk.embedding) {
        cachedChunksMap.set(chunk.hash, chunk);
      }
    }
  }

  // 3. Parse all files into chunks
  const allChunks: DocChunk[] = [];
  for (const relPath of filePaths) {
    const fullPath = path.resolve(cwd, relPath);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const chunks = parseMarkdownFile(content, relPath, {
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap
      });
      allChunks.push(...chunks);
    } catch (err) {
      if (options.verbose) {
        console.warn(pc.yellow(`Warning: Could not read ${relPath}: ${(err as Error).message}`));
      }
    }
  }

  // 4. Determine which chunks need embedding
  const chunksToEmbed: DocChunk[] = [];
  let cachedCount = 0;

  for (const chunk of allChunks) {
    const cached = cachedChunksMap.get(chunk.hash);
    if (cached && cached.embedding) {
      chunk.embedding = cached.embedding;
      cachedCount++;
    } else {
      chunksToEmbed.push(chunk);
    }
  }

  // 5. Generate embeddings for new/modified chunks
  if (chunksToEmbed.length > 0) {
    console.log(
      pc.dim(`Generating embeddings with [${config.model}] for ${chunksToEmbed.length} new/modified chunks...`)
    );
    const embedder = getEmbedder(config);
    const batchSize = 16;

    for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
      const batch = chunksToEmbed.slice(i, i + batchSize);
      const texts = batch.map(c => `${c.title}\n${c.content}`);
      const embeddings = await embedder.embed(texts);

      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddings[j];
      }
    }
  }

  // 6. Persist index
  const dimensions = config.dimensions || 384;
  storage.save(allChunks, config.model, dimensions, filePaths.length);

  const durationMs = Date.now() - startTime;
  console.log(pc.green('✔') + ' ' + pc.bold('Repository index updated successfully!'));
  console.log(`  Files scanned:       ${pc.cyan(filePaths.length.toString())}`);
  console.log(`  Total chunks:        ${pc.cyan(allChunks.length.toString())}`);
  console.log(`  Reused from cache:   ${pc.cyan(cachedCount.toString())}`);
  console.log(`  Newly embedded:      ${pc.cyan(chunksToEmbed.length.toString())}`);
  console.log(`  Total time:          ${pc.cyan(`${durationMs}ms`)}`);
}
