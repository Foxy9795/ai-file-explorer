import { Ollama } from 'ollama';
import type { AIProvider, ChatMessage, ProviderConfig } from './types.js';

export function defaultProviderConfig(): ProviderConfig {
  if (process.env.OPENAI_API_KEY) {
    return {
      kind: 'openai',
      chatModel: process.env.AFE_CHAT_MODEL ?? 'gpt-4o-mini',
      embedModel: process.env.AFE_EMBED_MODEL ?? 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_KEY,
    };
  }
  return {
    kind: 'ollama',
    chatModel: process.env.AFE_CHAT_MODEL ?? 'llama3.2:1b',
    embedModel: process.env.AFE_EMBED_MODEL ?? 'nomic-embed-text',
    baseUrl: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
  };
}

export function createProvider(config: ProviderConfig = defaultProviderConfig()): AIProvider {
  if (config.kind === 'ollama') {
    return new OllamaProvider(config);
  }
  return new OpenAIProvider(config);
}

class OllamaProvider implements AIProvider {
  public readonly name: string;
  private client: Ollama;
  private chatModel: string;
  private embedModel: string;

  constructor(cfg: ProviderConfig) {
    this.client = new Ollama({ host: cfg.baseUrl });
    this.chatModel = cfg.chatModel;
    this.embedModel = cfg.embedModel;
    this.name = `ollama:${this.chatModel}`;
  }

  async chat(messages: ChatMessage[], opts: { temperature?: number } = {}): Promise<string> {
    const res = await this.client.chat({
      model: this.chatModel,
      messages,
      options: { temperature: opts.temperature ?? 0.2 },
      stream: false,
    });
    return res.message.content;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const text of texts) {
      const res = await this.client.embeddings({
        model: this.embedModel,
        prompt: text,
      });
      out.push(res.embedding);
    }
    return out;
  }
}

class OpenAIProvider implements AIProvider {
  public readonly name: string;
  private apiKey: string;
  private chatModel: string;
  private embedModel: string;
  private baseUrl: string;

  constructor(cfg: ProviderConfig) {
    if (!cfg.apiKey) throw new Error('OpenAI provider requires an API key');
    this.apiKey = cfg.apiKey;
    this.chatModel = cfg.chatModel;
    this.embedModel = cfg.embedModel;
    this.baseUrl = cfg.baseUrl ?? 'https://api.openai.com/v1';
    this.name = `openai:${this.chatModel}`;
  }

  async chat(messages: ChatMessage[], opts: { temperature?: number } = {}): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        temperature: opts.temperature ?? 0.2,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0]?.message.content ?? '';
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.embedModel, input: texts }),
    });
    if (!res.ok) throw new Error(`OpenAI embed failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}
