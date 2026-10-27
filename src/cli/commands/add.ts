import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { runIndex } from './index.js';

export interface AddCommandOptions {
  status?: string;
  tag?: string[];
  author?: string;
  context?: string;
  index?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function getNextAdrNumber(decisionsDir: string): string {
  if (!fs.existsSync(decisionsDir)) {
    return '001';
  }

  const files = fs.readdirSync(decisionsDir);
  let highest = 0;

  for (const file of files) {
    const match = file.match(/adr-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }

  const next = highest + 1;
  return next.toString().padStart(3, '0');
}

export async function runAdd(title: string, options: AddCommandOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const decisionsDir = path.resolve(cwd, config.decisionsDir);

  if (!fs.existsSync(decisionsDir)) {
    fs.mkdirSync(decisionsDir, { recursive: true });
  }

  const adrNumber = getNextAdrNumber(decisionsDir);
  const slug = slugify(title);
  const fileName = `ADR-${adrNumber}-${slug}.md`;
  const filePath = path.join(decisionsDir, fileName);

  const status = options.status || 'accepted';
  const author = options.author || 'Engineering Team';
  const tags = options.tag && options.tag.length > 0 ? options.tag : ['architecture'];
  const today = new Date().toISOString().slice(0, 10);

  const contextText = options.context || 'Describe the context, problem statement, and forces that motivated this architectural decision.';

  const content = `---
title: "ADR-${adrNumber}: ${title}"
date: "${today}"
status: "${status}"
tags: ${JSON.stringify(tags)}
author: "${author}"
---

# ADR-${adrNumber}: ${title}

## Context & Problem Statement
${contextText}

## Decision
We decided to:
- Document the chosen approach and why alternatives were discarded.

## Consequences & Trade-offs
- **Positive:** Benefits gained from this decision.
- **Negative / Neutral:** Technical trade-offs, added complexity, or operational requirements.
`;

  fs.writeFileSync(filePath, content, 'utf8');

  console.log(pc.green('✔') + ' ' + pc.bold(`Created Architecture Decision Record:`));
  console.log(`  File:    ${pc.cyan(path.relative(cwd, filePath))}`);
  console.log(`  Title:   ${pc.bold(title)}`);
  console.log(`  Status:  ${pc.magenta(status)}`);
  console.log(`  Tags:    ${tags.join(', ')}`);

  if (options.index !== false) {
    console.log('');
    await runIndex();
  } else {
    console.log('');
    console.log(pc.dim(`Remember to run ${pc.cyan('lore index')} to update semantic memory.`));
  }
}
