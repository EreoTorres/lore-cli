import fs from 'node:fs';
import path from 'node:path';
import type { LoreConfig } from './types.js';

export const DEFAULT_CONFIG: LoreConfig = {
  include: [
    'README.md',
    'docs/**/*.md',
    '.lore/decisions/**/*.md',
    '**/*adr*.md',
    '**/*rfc*.md',
    'architecture/**/*.md'
  ],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.lore/index.json*',
    '**/.lore/models/**',
    '**/coverage/**'
  ],
  model: 'Xenova/all-MiniLM-L6-v2',
  provider: 'local',
  dimensions: 384,
  chunkSize: 800,
  chunkOverlap: 100,
  decisionsDir: '.lore/decisions',
  storageDir: '.lore'
};

const CONFIG_FILENAMES = ['.lore/config.json', '.lorerc.json', 'lore.config.json'];

export function findConfigFile(cwd: string = process.cwd()): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const fullPath = path.resolve(cwd, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export function loadConfig(cwd: string = process.cwd()): LoreConfig {
  const configFile = findConfigFile(cwd);
  if (!configFile) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configFile, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed
    };
  } catch (err) {
    console.warn(`Warning: Failed to parse ${configFile}, using default configuration.`);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Partial<LoreConfig>, cwd: string = process.cwd()): string {
  const targetDir = path.resolve(cwd, config.storageDir || DEFAULT_CONFIG.storageDir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, 'config.json');
  const merged = { ...DEFAULT_CONFIG, ...config };
  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf8');
  return targetPath;
}
