import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from '../src/core/config.js';

describe('Config Loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lore-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return defaults when no config file exists', () => {
    const config = loadConfig(tmpDir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('should fall back to defaults when config file is invalid JSON', () => {
    fs.mkdirSync(path.join(tmpDir, '.lore'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.lore', 'config.json'), 'not valid json {', 'utf8');

    const config = loadConfig(tmpDir);
    expect(config.model).toBe(DEFAULT_CONFIG.model);
    expect(config.provider).toBe(DEFAULT_CONFIG.provider);
  });

  it('should merge a partial config file over defaults', () => {
    fs.mkdirSync(path.join(tmpDir, '.lore'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.lore', 'config.json'),
      JSON.stringify({ chunkSize: 1200, provider: 'ollama' }),
      'utf8'
    );

    const config = loadConfig(tmpDir);
    expect(config.chunkSize).toBe(1200);
    expect(config.provider).toBe('ollama');
    expect(config.model).toBe(DEFAULT_CONFIG.model);
  });
});
