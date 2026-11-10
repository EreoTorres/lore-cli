import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { listAdrs, resolveAdrRef, updateAdrFrontmatter, getNextAdrNumber } from '../src/core/adr.js';
import { runAdd, buildAdrContent } from '../src/cli/commands/add.js';
import { runSupersede } from '../src/cli/commands/supersede.js';
import { runMark } from '../src/cli/commands/mark.js';

describe('ADR Lifecycle', () => {
  let tmpDir: string;
  let decisionsDir: string;

  const writeAdr = (num: string, title: string, status = 'accepted') => {
    const content = buildAdrContent({
      adrNumber: num,
      title,
      status,
      tags: ['test'],
      author: 'Tester',
      date: '2026-11-09',
      context: 'ctx'
    });
    fs.writeFileSync(path.join(decisionsDir, `ADR-${num}-${title.toLowerCase().replace(/\s+/g, '-')}.md`), content, 'utf8');
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lore-adr-'));
    decisionsDir = path.join(tmpDir, '.lore', 'decisions');
    fs.mkdirSync(decisionsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should list ADRs sorted by number with stripped titles', () => {
    writeAdr('002', 'Second decision');
    writeAdr('001', 'First decision');

    const adrs = listAdrs(decisionsDir);
    expect(adrs.map(a => a.number)).toEqual(['001', '002']);
    expect(adrs[0].title).toBe('First decision');
    expect(adrs[0].status).toBe('accepted');
    expect(adrs[0].tags).toEqual(['test']);
  });

  it('should resolve ADR references in multiple formats', () => {
    writeAdr('003', 'Third decision');

    expect(resolveAdrRef(decisionsDir, '3')?.number).toBe('003');
    expect(resolveAdrRef(decisionsDir, '003')?.number).toBe('003');
    expect(resolveAdrRef(decisionsDir, 'ADR-003')?.number).toBe('003');
    expect(resolveAdrRef(decisionsDir, '999')).toBeNull();
    expect(resolveAdrRef(decisionsDir, 'nope')).toBeNull();
  });

  it('should update frontmatter while preserving the body', () => {
    writeAdr('001', 'First decision');
    const filePath = listAdrs(decisionsDir)[0].filePath;

    updateAdrFrontmatter(filePath, { status: 'deprecated', superseded_by: 'ADR-002' });

    const parsed = matter(fs.readFileSync(filePath, 'utf8'));
    expect(parsed.data.status).toBe('deprecated');
    expect(parsed.data.superseded_by).toBe('ADR-002');
    expect(parsed.data.title).toBe('ADR-001: First decision');
    expect(parsed.content).toContain('## Context & Problem Statement');
    expect(parsed.content).toContain('## Decision');
  });

  it('should supersede an existing ADR linking both records', async () => {
    writeAdr('001', 'Use REST API');

    const created = await runSupersede('1', 'Use GraphQL API', { index: false }, tmpDir);
    expect(created.adrNumber).toBe('002');

    const adrs = listAdrs(decisionsDir);
    expect(adrs.length).toBe(2);

    const oldAdr = adrs.find(a => a.number === '001')!;
    expect(oldAdr.status).toBe('superseded');
    expect(oldAdr.supersededBy).toBe('ADR-002');

    const newAdr = adrs.find(a => a.number === '002')!;
    expect(newAdr.status).toBe('accepted');
    expect(newAdr.supersedes).toEqual(['ADR-001']);
    expect(newAdr.title).toBe('Use GraphQL API');
  });

  it('should throw when superseding a missing ADR', async () => {
    await expect(runSupersede('42', 'New idea', { index: false }, tmpDir)).rejects.toThrow(/not found/);
  });

  it('should change status with mark and reject invalid statuses', async () => {
    writeAdr('001', 'First decision');

    await runMark('ADR-001', 'deprecated', { index: false }, tmpDir);
    expect(listAdrs(decisionsDir)[0].status).toBe('deprecated');

    await expect(runMark('1', 'bogus', { index: false }, tmpDir)).rejects.toThrow(/Invalid status/);
  });

  it('should compute the next ADR number after lifecycle operations', async () => {
    writeAdr('001', 'First decision');
    await runSupersede('1', 'Second decision', { index: false }, tmpDir);
    expect(getNextAdrNumber(decisionsDir)).toBe('003');
  });

  it('should create ADRs via runAdd with explicit cwd and supersedes metadata', async () => {
    const created = await runAdd('Standalone decision', { index: false, supersedes: ['ADR-009'] }, tmpDir);
    expect(created.adrNumber).toBe('001');

    const parsed = matter(fs.readFileSync(created.filePath, 'utf8'));
    expect(parsed.data.supersedes).toEqual(['ADR-009']);
  });
});
