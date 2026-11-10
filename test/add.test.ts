import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { buildAdrContent } from '../src/cli/commands/add.js';

describe('ADR Content Builder', () => {
  it('should produce parseable frontmatter when title and author contain quotes or colons', () => {
    const content = buildAdrContent({
      adrNumber: '007',
      title: 'Use "pg" driver: why & how',
      status: 'accepted',
      tags: ['db', 'infra'],
      author: 'Team "Core"',
      date: '2026-11-09',
      context: 'Some context'
    });

    const parsed = matter(content);
    expect(parsed.data.title).toBe('ADR-007: Use "pg" driver: why & how');
    expect(parsed.data.author).toBe('Team "Core"');
    expect(parsed.data.status).toBe('accepted');
    expect(parsed.data.tags).toEqual(['db', 'infra']);
    expect(parsed.content).toContain('Some context');
  });

  it('should produce parseable frontmatter for plain titles', () => {
    const content = buildAdrContent({
      adrNumber: '001',
      title: 'Adopt PostgreSQL',
      status: 'proposed',
      tags: ['architecture'],
      author: 'Engineering Team',
      date: '2026-11-09',
      context: 'ctx'
    });

    const parsed = matter(content);
    expect(parsed.data.title).toBe('ADR-001: Adopt PostgreSQL');
    expect(parsed.data.date).toBe('2026-11-09');
  });
});
