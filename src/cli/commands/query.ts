import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { VectorStorage } from '../../storage/index.js';
import { getEmbedder } from '../../embedder/index.js';
import { hybridSearch } from '../../search/hybrid.js';

export interface QueryCommandOptions {
  topK?: string | number;
  json?: boolean;
}

export async function runQuery(queryText: string, options: QueryCommandOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const storage = new VectorStorage(config, cwd);

  if (!storage.exists()) {
    console.error(pc.red('Error:') + ' No index found in this repository.');
    console.error(`Run ${pc.cyan('lore index')} first to index the documentation.`);
    process.exitCode = 1;
    return;
  }

  const manifest = storage.load();
  if (!manifest || manifest.chunks.length === 0) {
    console.log(pc.yellow('Index is empty. Add documents and run lore index.'));
    return;
  }

  const topK = options.topK ? Number(options.topK) : 5;
  const embedder = getEmbedder(config);

  const results = await hybridSearch(queryText, manifest.chunks, embedder, { topK });

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log('');
  console.log(pc.bold(pc.blue('🔍 Lore Search:')) + ` "${queryText}"`);
  console.log(pc.dim(`Found ${results.length} relevant sections across ${manifest.fileCount} files:`));
  console.log('');

  if (results.length === 0) {
    console.log(pc.yellow('No matching decisions or architecture notes found.'));
    return;
  }

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const chunk = res.chunk;
    const scorePct = Math.round(res.score * 100);

    const scoreColor = scorePct > 80 ? pc.green : scorePct > 60 ? pc.yellow : pc.dim;
    const absPath = path.resolve(cwd, chunk.filePath).replace(/\\/g, '/');
    const link = `file:///${absPath}#L${chunk.startLine}-L${chunk.endLine}`;

    console.log(
      pc.bold(`${i + 1}. `) +
      scoreColor(`[${scorePct}% match] `) +
      pc.bold(pc.white(chunk.title))
    );

    if (chunk.sectionHierarchy.length > 0) {
      console.log(`   ${pc.dim('Section:')} ${pc.magenta(chunk.sectionHierarchy.join(' > '))}`);
    }

    console.log(`   ${pc.dim('File:')}    ${pc.underline(pc.cyan(chunk.filePath))}${pc.dim(` (lines ${chunk.startLine}-${chunk.endLine})`)}`);
    console.log(`   ${pc.dim('Link:')}    ${pc.dim(link)}`);

    if (chunk.metadata.tags && Array.isArray(chunk.metadata.tags) && chunk.metadata.tags.length > 0) {
      console.log(`   ${pc.dim('Tags:')}    ${chunk.metadata.tags.map(t => pc.bgBlue(pc.black(` ${t} `))).join(' ')}`);
    }

    console.log('');
    console.log(pc.italic(`   "${res.snippet.replace(/\n/g, '\n   ')}"`));
    console.log(pc.dim('   ' + '─'.repeat(60)));
    console.log('');
  }
}
