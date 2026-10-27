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
});
