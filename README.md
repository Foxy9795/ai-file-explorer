# AI File Explorer

An AI-powered desktop file explorer plus a matching CLI. Runs **fully offline** using local models via [Ollama](https://ollama.com/).

## Features

- **Natural-language search** — "find the invoice from March" across a folder's contents.
- **Chat with a folder (RAG)** — ask questions about your files and get cited answers.
- **File summaries** — one-click summary for any text-like file.
- **Smart tagging** — AI suggests tags based on file content.
- **Similar files** — find files semantically similar to a given one.

Two shipping surfaces share the same core library:

- `desktop/` — Electron + React desktop app (primary UX).
- `cli/` — Node CLI for the same operations from a terminal.
- `core/` — shared TypeScript library: file scanning, extraction, embeddings, RAG, Ollama client.

## Requirements

- Node.js 20+
- [Ollama](https://ollama.com/) running locally (`ollama serve`) with:
  - `llama3.2:1b` (or any chat model — configurable)
  - `nomic-embed-text` (for embeddings)

```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
```

If you later set `OPENAI_API_KEY`, the OpenAI provider is used automatically. Otherwise it falls back to Ollama.

## Development

```bash
npm install
npm run build

# Desktop app
npm run dev:desktop

# CLI
npm run build:cli
./cli/dist/bin.js --help
```

## CLI examples

```bash
afe index ~/Documents
afe search "invoice from March"
afe chat "what did I spend on rent in 2024?"
afe summarize ~/Documents/notes.md
afe tag ~/Documents/notes.md
afe similar ~/Documents/notes.md
```

## Architecture

```
┌──────────────┐   ┌──────────────┐
│ Electron app │   │   Node CLI   │
└──────┬───────┘   └──────┬───────┘
       │                  │
       └────────┬─────────┘
                │
          ┌─────▼─────┐
          │  @afe/core │
          │           │
          │ scanner   │
          │ extractor │
          │ store     │
          │ embeddings│
          │ RAG       │
          │ provider  │
          └─────┬─────┘
                │
        ┌───────▼────────┐
        │ Ollama (local) │
        └────────────────┘
```

The index is a SQLite database (embeddings + metadata) stored per-root in `<app-data>/indexes/<hash>.db`, so indexing is incremental and survives restarts.

## License

MIT
