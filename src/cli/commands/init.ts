import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { DEFAULT_CONFIG, saveConfig } from '../../core/config.js';

const SAMPLE_ADR = `---
title: "ADR-001: Record Architecture Decisions with Lore"
date: "${new Date().toISOString().slice(0, 10)}"
status: "accepted"
tags: ["architecture", "tooling", "governance"]
author: "Engineering Team"
---

# ADR-001: Record Architecture Decisions with Lore

## Context
As engineering teams grow and repositories evolve, the context and rationale behind critical architecture decisions get lost across Slack messages, pull request comments, and meetings. New team members and AI coding assistants lack institutional memory, leading to recurring debates, regressions, and duplicate efforts.

## Decision
We adopt \`lore\` as the institutional memory engine for this repository.
All major technical decisions, architectural patterns, and incident post-mortems will be documented under \`.lore/decisions/\` or \`docs/\`.

## Consequences
- **Positive:** Fast semantic retrieval directly from terminal and AI assistants via MCP.
- **Positive:** Institutional knowledge stays version-controlled alongside code.
- **Trade-off:** Developers must document decisions as part of the PR workflow.
`;

export async function runInit(options: { force?: boolean } = {}): Promise<void> {
  const cwd = process.cwd();
  const loreDir = path.resolve(cwd, '.lore');
  const decisionsDir = path.resolve(cwd, '.lore', 'decisions');

  if (!fs.existsSync(decisionsDir)) {
    fs.mkdirSync(decisionsDir, { recursive: true });
  }

  // 1. Create config
  const configPath = saveConfig(DEFAULT_CONFIG, cwd);

  // 2. Create sample ADR if none exists
  const sampleAdrPath = path.join(decisionsDir, 'ADR-001-record-architecture-decisions.md');
  if (!fs.existsSync(sampleAdrPath) || options.force) {
    fs.writeFileSync(sampleAdrPath, SAMPLE_ADR, 'utf8');
  }

  // 3. Update .gitignore if present
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const ignoreEntry = '.lore/index.json';
    if (!gitignoreContent.includes(ignoreEntry)) {
      fs.appendFileSync(gitignorePath, `\n# Lore vector index cache\n${ignoreEntry}\n`);
    }
  }

  console.log(pc.green('✔') + ' ' + pc.bold('Initialized Lore in repository!'));
  console.log(`  Config created:    ${pc.cyan(path.relative(cwd, configPath))}`);
  console.log(`  Decisions folder:  ${pc.cyan(path.relative(cwd, decisionsDir))}`);
  console.log(`  Sample ADR:        ${pc.cyan(path.relative(cwd, sampleAdrPath))}`);
  console.log('');
  console.log(pc.dim('Next steps:'));
  console.log(`  1. Run ${pc.cyan('lore index')} to build the semantic memory index.`);
  console.log(`  2. Run ${pc.cyan('lore query "why lore"')} to search repo lore.`);
  console.log(`  3. Run ${pc.cyan('lore add "Your Decision"')} to record a new ADR.`);
}
