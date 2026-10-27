export type EmbedderProvider = 'local' | 'ollama' | 'openai';

export interface LoreConfig {
  include: string[];
  exclude: string[];
  model: string;
  provider: EmbedderProvider;
  dimensions: number;
  chunkSize: number;
  chunkOverlap: number;
  decisionsDir: string;
  storageDir: string;
  ollamaBaseUrl?: string;
  openaiApiKey?: string;
}

export interface ChunkMetadata {
  tags?: string[];
  author?: string;
  date?: string;
  status?: 'accepted' | 'proposed' | 'deprecated' | 'superseded';
  [key: string]: unknown;
}

export interface DocChunk {
  id: string;
  filePath: string;
  title: string;
  sectionHierarchy: string[];
  startLine: number;
  endLine: number;
  content: string;
  hash: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface SearchResult {
  chunk: DocChunk;
  score: number;
  vectorScore: number;
  lexicalScore: number;
  snippet: string;
}

export interface IndexManifest {
  version: string;
  model: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  chunkCount: number;
  chunks: DocChunk[];
}
