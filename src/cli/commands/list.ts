import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { listAdrs, ADR_STATUSES } from '../../core/adr.js';

export interface ListCommandOptions {
  status?: string;
  json?: boolean;
}

function statusColor(status: string): (text: string) => string {
  switch (status) {
    case 'accepted': return pc.green;
    case 'proposed': return pc.yellow;
    case 'deprecated': return pc.red;
    case 'superseded': return pc.magenta;
    default: return pc.dim;
  }
}

export async function runList(options: ListCommandOptions = {}, cwd: string = process.cwd()): Promise<void> {
  const config = loadConfig(cwd);
  const decisionsDir = path.resolve(cwd, config.decisionsDir);

  let adrs = listAdrs(decisionsDir);

  if (options.status) {
    if (!ADR_STATUSES.includes(options.status as (typeof ADR_STATUSES)[number])) {
      throw new Error(`Invalid status "${options.status}". Valid values: ${ADR_STATUSES.join(' | ')}`);
    }
    adrs = adrs.filter(a => a.status === options.status);
  }

  if (options.json) {
    console.log(JSON.stringify(adrs.map(a => ({ ...a, filePath: path.relative(cwd, a.filePath) })), null, 2));
    return;
  }

  if (adrs.length === 0) {
    console.log(pc.yellow('No Architecture Decision Records found.'));
    console.log(pc.dim(`Create the first one with ${pc.cyan('lore add "Your Decision"')}.`));
    return;
  }

  console.log('');
  console.log(pc.bold(pc.blue(`📜 Architecture Decision Records (${adrs.length})`)));
  console.log('');

  const statusWidth = Math.max(...adrs.map(a => a.status.length));

  for (const adr of adrs) {
    const color = statusColor(adr.status);
    let relation = '';
    if (adr.supersededBy) {
      relation = pc.dim(` → superseded by ${adr.supersededBy}`);
    } else if (adr.supersedes && adr.supersedes.length > 0) {
      relation = pc.dim(` ↩ supersedes ${adr.supersedes.join(', ')}`);
    }

    console.log(
      `  ${pc.bold(`ADR-${adr.number}`)}  ` +
      color(adr.status.padEnd(statusWidth)) + '  ' +
      adr.title +
      (adr.date ? pc.dim(`  (${adr.date})`) : '') +
      relation
    );

    if (adr.tags.length > 0) {
      console.log(`           ${pc.dim('tags:')} ${pc.dim(adr.tags.join(', '))}`);
    }
  }

  console.log('');
}
