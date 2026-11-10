import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export const ADR_STATUSES = ['accepted', 'proposed', 'deprecated', 'superseded'] as const;
export type AdrStatus = (typeof ADR_STATUSES)[number];

export interface AdrInfo {
  number: string;
  title: string;
  status: string;
  date?: string;
  tags: string[];
  author?: string;
  fileName: string;
  filePath: string;
  supersedes?: string[];
  supersededBy?: string;
}

export function getNextAdrNumber(decisionsDir: string): string {
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

function asDateString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  return undefined;
}

export function listAdrs(decisionsDir: string): AdrInfo[] {
  if (!fs.existsSync(decisionsDir)) return [];

  const files = fs.readdirSync(decisionsDir).filter(f => /^adr-\d+.*\.md$/i.test(f));
  const adrs: AdrInfo[] = [];

  for (const file of files) {
    const filePath = path.join(decisionsDir, file);
    const number = file.match(/adr-(\d+)/i)![1];

    try {
      const parsed = matter(fs.readFileSync(filePath, 'utf8'));
      const data = parsed.data as Record<string, unknown>;

      adrs.push({
        number,
        title: typeof data.title === 'string' ? data.title.replace(/^ADR-\d+:\s*/, '') : file,
        status: typeof data.status === 'string' ? data.status : 'unknown',
        date: asDateString(data.date),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        author: typeof data.author === 'string' ? data.author : undefined,
        fileName: file,
        filePath,
        supersedes: Array.isArray(data.supersedes) ? data.supersedes.map(String) : undefined,
        supersededBy: typeof data.superseded_by === 'string' ? data.superseded_by : undefined
      });
    } catch {
      adrs.push({ number, title: file, status: 'unparseable', tags: [], fileName: file, filePath });
    }
  }

  return adrs.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
}

export function resolveAdrRef(decisionsDir: string, ref: string): AdrInfo | null {
  const digits = ref.match(/(\d+)/)?.[1];
  if (!digits) return null;
  const target = parseInt(digits, 10);
  return listAdrs(decisionsDir).find(a => parseInt(a.number, 10) === target) || null;
}

export function updateAdrFrontmatter(filePath: string, patch: Record<string, unknown>): void {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const merged: Record<string, unknown> = { ...parsed.data };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  fs.writeFileSync(filePath, matter.stringify(parsed.content, merged), 'utf8');
}
