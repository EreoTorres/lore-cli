import pc from 'picocolors';
import { loadConfig, findConfigFile } from '../../core/config.js';
import { VectorStorage } from '../../storage/index.js';

export async function runStatus(): Promise<void> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const configFile = findConfigFile(cwd);
  const storage = new VectorStorage(config, cwd);
  const stats = storage.getStats();

  console.log('');
  console.log(pc.bold(pc.blue('📊 Lore Repository Status')));
  console.log(pc.dim('─'.repeat(45)));

  console.log(`  Config File:       ${configFile ? pc.cyan(configFile) : pc.yellow('Default (no config file)')}`);
  console.log(`  Embedder Model:    ${pc.green(config.model)} (${config.dimensions} dims, ${config.provider})`);
  console.log(`  Index Exists:      ${stats.exists ? pc.green('Yes') : pc.red('No (run `lore index`)')}`);

  if (stats.exists) {
    console.log(`  Indexed Files:     ${pc.bold(stats.fileCount.toString())}`);
    console.log(`  Total Chunks:      ${pc.bold(stats.chunkCount.toString())}`);
    console.log(`  Storage Size:      ${pc.bold(`${stats.sizeKb} KB`)}`);
    console.log(`  Last Updated:      ${pc.dim(stats.updatedAt || 'N/A')}`);
  }

  console.log(pc.dim('─'.repeat(45)));
  console.log('');
}
