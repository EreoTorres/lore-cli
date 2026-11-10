import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { resolveAdrRef, updateAdrFrontmatter, ADR_STATUSES, type AdrStatus } from '../../core/adr.js';
import { runIndex } from './index.js';

export interface MarkCommandOptions {
  index?: boolean;
}

export async function runMark(
  ref: string,
  status: string,
  options: MarkCommandOptions = {},
  cwd: string = process.cwd()
): Promise<void> {
  if (!ADR_STATUSES.includes(status as AdrStatus)) {
    throw new Error(`Invalid status "${status}". Valid values: ${ADR_STATUSES.join(' | ')}`);
  }

  const config = loadConfig(cwd);
  const decisionsDir = path.resolve(cwd, config.decisionsDir);

  const adr = resolveAdrRef(decisionsDir, ref);
  if (!adr) {
    throw new Error(`ADR "${ref}" not found in ${path.relative(cwd, decisionsDir)}. Run "lore list" to see available records.`);
  }

  updateAdrFrontmatter(adr.filePath, { status });

  console.log(
    pc.green('✔') + ' ' +
    pc.bold(`ADR-${adr.number}`) + pc.dim(' status: ') +
    pc.dim(`${adr.status} → `) + pc.bold(status)
  );

  if (options.index !== false) {
    console.log('');
    await runIndex();
  }
}
