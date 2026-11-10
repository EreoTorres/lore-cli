import { describe, it, expect } from 'vitest';
import { parseMarkdownFile, computeHash } from '../src/chunker/markdown.js';

describe('Markdown Chunker', () => {
  it('should parse frontmatter and headings hierarchy correctly', () => {
    const markdown = `---
title: "Architecture Guide"
tags: ["core", "infra"]
---

# Overview
This is the system overview.

## Database Layer
We use PostgreSQL for all transactional data.

### Replication & Failover
Hot standby replicas are deployed across availability zones.
`;

    const chunks = parseMarkdownFile(markdown, 'docs/arch.md');
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    const dbChunk = chunks.find(c => c.sectionHierarchy.includes('Database Layer'));
    expect(dbChunk).toBeDefined();
    expect(dbChunk?.filePath).toBe('docs/arch.md');
    expect(dbChunk?.metadata.tags).toEqual(['core', 'infra']);
    expect(dbChunk?.content).toContain('PostgreSQL');

    const replicaChunk = chunks.find(c => c.sectionHierarchy.includes('Replication & Failover'));
    expect(replicaChunk).toBeDefined();
    expect(replicaChunk?.sectionHierarchy).toEqual(['Overview', 'Database Layer', 'Replication & Failover']);
  });

  it('should calculate deterministic content hashes', () => {
    const text1 = 'Hello world';
    const text2 = 'Hello world';
    const text3 = 'Different text';

    expect(computeHash(text1)).toBe(computeHash(text2));
    expect(computeHash(text1)).not.toBe(computeHash(text3));
  });

  it('should preserve line numbers accurately', () => {
    const markdown = `# Title

Line 3 content
Line 4 content

## Section 2
Line 8 content
`;

    const chunks = parseMarkdownFile(markdown, 'test.md');
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[1].startLine).toBe(6);
  });

  it('should map line numbers to the raw file including frontmatter offset', () => {
    const markdown = `---
title: "X"
---

# Overview
Body line here.
`;
    // "# Overview" is line 5 of the raw file on disk
    const chunks = parseMarkdownFile(markdown, 'a.md');
    expect(chunks.length).toBe(1);
    expect(chunks[0].startLine).toBe(5);
    expect(chunks[0].endLine).toBeGreaterThanOrEqual(6);
  });

  it('should assign real line ranges to sub-chunks of large sections', () => {
    const paras = Array.from({ length: 6 }, (_, i) => `Paragraph ${i} ` + 'x'.repeat(120));
    const markdown = `# Big\n\n${paras.join('\n\n')}\n`;
    // Paragraphs sit on raw lines 3, 5, 7, 9, 11, 13
    const chunks = parseMarkdownFile(markdown, 'big.md', { chunkSize: 300, chunkOverlap: 0 });
    expect(chunks.map(c => [c.startLine, c.endLine])).toEqual([
      [3, 5],
      [7, 9],
      [11, 13]
    ]);
  });

  it('should carry overlap content between sub-chunks when chunkOverlap is set', () => {
    const markdown = `# Big\n\n${'A'.repeat(200)}\n\n${'B'.repeat(200)}\n\n${'C'.repeat(200)}\n`;
    const chunks = parseMarkdownFile(markdown, 'big.md', { chunkSize: 450, chunkOverlap: 250 });
    expect(chunks.length).toBe(2);
    // Second chunk re-includes the trailing paragraph of the first for context continuity
    expect(chunks[1].content).toContain('B'.repeat(200));
    expect(chunks[1].content).toContain('C'.repeat(200));
    expect(chunks[1].startLine).toBe(chunks[0].endLine);
  });
});
