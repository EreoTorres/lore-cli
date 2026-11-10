import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { getNextAdrNumber } from '../../core/adr.js';
import { runIndex } from './index.js';

export interface AddCommandOptions {
  status?: string;
  tag?: string[];
  author?: string;
  context?: string;
  index?: boolean;
  supersedes?: string[];
  /** Internal: callers that index right after (e.g. supersede) suppress the reminder */
  suppressIndexHint?: boolean;
}

export interface CreatedAdr {
  adrNumber: string;
  fileName: string;
  filePath: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export interface AdrContentParams {
  adrNumber: string;
  title: string;
  status: string;
  tags: string[];
  author: string;
  date: string;
  context: string;
  supersedes?: string[];
}

export function buildAdrContent(params: AdrContentParams): string {
  const { adrNumber, title, status, tags, author, date, context, supersedes } = params;
  const supersedesLine = supersedes && supersedes.length > 0
    ? `\nsupersedes: ${JSON.stringify(supersedes)}`
    : '';
  // JSON-escaped strings are valid YAML scalars; prevents broken frontmatter on quotes/colons
  return `---
title: ${JSON.stringify(`ADR-${adrNumber}: ${title}`)}
date: ${JSON.stringify(date)}
status: ${JSON.stringify(status)}
tags: ${JSON.stringify(tags)}
author: ${JSON.stringify(author)}${supersedesLine}
---

# ADR-${adrNumber}: ${title}

## Context & Problem Statement
${context}

## Decision
We decided to:
- Document the chosen approach and why alternatives were discarded.

## Consequences & Trade-offs
- **Positive:** Benefits gained from this decision.
- **Negative / Neutral:** Technical trade-offs, added complexity, or operational requirements.
`;
}

export async function runAdd(
  title: string,
  options: AddCommandOptions = {},
  cwd: string = process.cwd()
): Promise<CreatedAdr> {
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

  const content = buildAdrContent({
    adrNumber,
    title,
    status,
    tags,
    author,
    date: today,
    context: contextText,
    supersedes: options.supersedes
  });

  fs.writeFileSync(filePath, content, 'utf8');

  console.log(pc.green('✔') + ' ' + pc.bold(`Created Architecture Decision Record:`));
  console.log(`  File:    ${pc.cyan(path.relative(cwd, filePath))}`);
  console.log(`  Title:   ${pc.bold(title)}`);
  console.log(`  Status:  ${pc.magenta(status)}`);
  console.log(`  Tags:    ${tags.join(', ')}`);

  if (options.index !== false) {
    console.log('');
    await runIndex();
  } else if (!options.suppressIndexHint) {
    console.log('');
    console.log(pc.dim(`Remember to run ${pc.cyan('lore index')} to update semantic memory.`));
  }

  return { adrNumber, fileName, filePath };
}
