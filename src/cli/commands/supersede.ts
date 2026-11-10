import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { resolveAdrRef, updateAdrFrontmatter } from '../../core/adr.js';
import { runAdd, type CreatedAdr } from './add.js';
import { runIndex } from './index.js';

export interface SupersedeCommandOptions {
  tag?: string[];
  author?: string;
  context?: string;
  index?: boolean;
}

export async function runSupersede(
  ref: string,
  title: string,
  options: SupersedeCommandOptions = {},
  cwd: string = process.cwd()
): Promise<CreatedAdr> {
  const config = loadConfig(cwd);
  const decisionsDir = path.resolve(cwd, config.decisionsDir);

  const old = resolveAdrRef(decisionsDir, ref);
  if (!old) {
    throw new Error(`ADR "${ref}" not found in ${path.relative(cwd, decisionsDir)}. Run "lore list" to see available records.`);
  }

  if (old.status === 'superseded') {
    console.warn(pc.yellow(`⚠ ADR-${old.number} is already superseded${old.supersededBy ? ` by ${old.supersededBy}` : ''}.`));
  }

  const created = await runAdd(
    title,
    {
      tag: options.tag,
      author: options.author,
      context: options.context,
      supersedes: [`ADR-${old.number}`],
      index: false,
      suppressIndexHint: true
    },
    cwd
  );

  updateAdrFrontmatter(old.filePath, {
    status: 'superseded',
    superseded_by: `ADR-${created.adrNumber}`
  });

  console.log('');
  console.log(
    pc.green('✔') + ' ' +
    pc.bold(`ADR-${old.number}`) + pc.dim(' marked as superseded by ') + pc.bold(`ADR-${created.adrNumber}`)
  );

  if (options.index !== false) {
    console.log('');
    await runIndex();
  } else {
    console.log(pc.dim(`Remember to run ${pc.cyan('lore index')} to update semantic memory.`));
  }

  return created;
}
