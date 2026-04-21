export interface FileRecord {
  id: number;
  path: string;
  name: string;
  ext: string;
  size: number;
  mtime: number;
  indexedAt: number;
  hash: string;
  summary: string | null;
  tags: string | null;
}

export interface ChunkRecord {
  id: number;
  fileId: number;
  ordinal: number;
  text: string;
  embedding: Float32Array;
}

export interface SearchHit {
  file: FileRecord;
  score: number;
  snippet: string;
  chunkOrdinal: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: SearchHit[];
}

export interface IndexProgress {
  scanned: number;
  indexed: number;
  skipped: number;
  total: number;
  currentPath?: string;
  done: boolean;
}

export interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], opts?: { temperature?: number }): Promise<string>;
  embed(texts: string[]): Promise<number[][]>;
}

export interface ProviderConfig {
  kind: 'ollama' | 'openai';
  chatModel: string;
  embedModel: string;
  baseUrl?: string;
  apiKey?: string;
}
