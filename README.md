<div align="center">

# 🏛️ Lore (`lore-cli`)

**The institutional memory of your codebase.**  
*Zero-config local semantic retrieval & Architecture Decision Record (ADR) engine for engineering teams and AI coding agents.*

[![CI](https://github.com/EreoTorres/lore-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/EreoTorres/lore-cli/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/Node->=18.0.0-green.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Enabled-purple.svg)](https://modelcontextprotocol.io/)

</div>

---

## ⚡ The Problem: Institutional Memory Decay

In software engineering, code explains **what** the system does. It rarely explains **why**.

- *"Why did we choose PostgreSQL with pgvector over a standalone vector database?"*
- *"What was the root cause and mitigation for the webhook race condition last quarter?"*
- *"Where is our multi-tenant isolation strategy documented?"*

As teams grow and codebases evolve, architectural context gets buried across closed PRs, stale Slack threads, and outdated wikis. New engineers spend weeks deciphering legacy choices, and AI coding assistants (Cursor, Claude, Copilot) frequently hallucinate or suggest patterns that violate existing team consensus.

**`lore` solves this.** It turns your repository's documentation, ADRs, RFCs, and markdown guides into an ultra-fast, local, queryable semantic memory bank.

---

## ✨ Features

- **🚀 Zero-Cloud & Zero-Config:** Runs 100% locally with embedded ONNX embeddings via Transformers.js (`all-MiniLM-L6-v2`). No API keys or external services required.
- **🔍 Hybrid Search (RRF):** Combines **Vector Cosine Similarity** (conceptual search) with **Okapi BM25** (exact keyword & technical token matching) using Reciprocal Rank Fusion.
- **⚡ Incremental Caching:** Content-hash based delta indexing (SHA-256). Re-indexing an unchanged repository takes under **25 milliseconds**.
- **🤖 Built-in MCP Server (`lore mcp`):** Plugs natively into **Claude Desktop**, **Cursor**, and agentic workflows via the Model Context Protocol.
- **📝 Native ADR Lifecycle:** Scaffold, record, and automatically index Architecture Decision Records directly from the terminal (`lore add`).
- **🔗 Clickable Source Links:** Terminal output displays precise file paths and line ranges with clickable `file://` URIs.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────────────┐
                               │  Repository Markdown & Docs    │
                               │  (ADRs, RFCs, READMEs, docs/)  │
                               └──────────────┬─────────────────┘
                                              │
                                              ▼
                               ┌────────────────────────────────┐
                               │  Intelligent Markdown Chunker  │
                               │  (Header Hierarchy + Metadata) │
                               └──────────────┬─────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │     Embedder Engine     │                     │     Okapi BM25 Index    │
         │ (Transformers.js Local) │                     │ (Exact Keyword & Token) │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │  Dense Vector Similarity│                     │  Lexical Term Frequency │
         │   (Cosine Product)      │                     │   (IDF Normalization)   │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                               ┌────────────────────────────────┐
                               │ Reciprocal Rank Fusion (RRF)   │
                               │   Hybrid Relevance Scorer      │
                               └──────────────┬─────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │   Developer CLI Output  │                     │   MCP Server (stdio)    │
         │  (Terminal, JSON, Link) │                     │  (Cursor, Claude, IDE)  │
         └─────────────────────────┘                     └─────────────────────────┘
```

---

## 🚀 Quickstart

### 1. Initialize Lore in your repository

```bash
# Run via npx or global install
npx lore-cli init
```

This creates `.lore/config.json` and `.lore/decisions/` with your first sample ADR.

### 2. Index your documentation

```bash
npx lore-cli index
```

Output:
```text
⚡ Lore: Indexing repository memory...
✔ Repository index updated successfully!
  Files scanned:       8
  Total chunks:        24
  Reused from cache:   24
  Newly embedded:      0
  Total time:          18ms
```

### 3. Query your codebase lore

```bash
npx lore-cli query "how do we handle background workers and queues"
```

Output:
```text
🔍 Lore Search: "how do we handle background workers and queues"
Found 3 relevant sections across 2 files:

1. [100% match] ADR-002: Migrate background worker to BullMQ and Redis
   Section: ADR-002: Migrate background worker to BullMQ and Redis > Decision
   File:    .lore/decisions/ADR-002-migrate-background-worker-to-bullmq-and-redis.md (lines 7-10)
   Link:    file:///C:/dev/repo/.lore/decisions/ADR-002-migrate-background-worker-to-bullmq-and-redis.md#L7-L10
   Tags:    queue, redis

   "We decided to adopt BullMQ with Redis Streams for asynchronous job processing,
   ensuring at-least-once delivery and distributed concurrency control."
```

### 4. Record a new architectural decision

```bash
npx lore-cli add "Adopt PostgreSQL with pgvector for semantic search" \
  --tag db \
  --tag rag \
  --status accepted
```

Generates a versioned ADR file (`ADR-003-...`), updates `.lore/decisions/`, and automatically re-indexes repository memory in under half a second.

---

## 🤖 MCP (Model Context Protocol) Integration

`lore` includes a standard Model Context Protocol server. This allows AI assistants in Cursor or Claude Desktop to consult your architecture decisions automatically when writing code.

### Claude Desktop Configuration

Add `lore` to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "repo-lore": {
      "command": "npx",
      "args": ["-y", "lore-cli", "mcp"],
      "cwd": "/path/to/your/repository"
    }
  }
}
```

### Available MCP Tools:
- **`lore_search`**: Semantic + lexical search over all repository decisions, RFCs, and architecture docs.
- **`lore_add_decision`**: Let your AI assistant record agreed-upon technical decisions as ADRs.
- **`lore_status`**: Inspect indexed chunk count, files, and last update timestamp.

---

## ⚙️ Configuration (`.lore/config.json`)

```json
{
  "include": [
    "README.md",
    "docs/**/*.md",
    ".lore/decisions/**/*.md",
    "**/*adr*.md",
    "architecture/**/*.md"
  ],
  "exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/.lore/index.json*"
  ],
  "model": "Xenova/all-MiniLM-L6-v2",
  "provider": "local",
  "dimensions": 384,
  "chunkSize": 800,
  "chunkOverlap": 100,
  "decisionsDir": ".lore/decisions",
  "storageDir": ".lore"
}
```

Optional cloud providers (`openai`, `ollama`) can also be configured if your organization standardizes on central embedding endpoints.

---

## 🧪 Testing

```bash
npm test
```

Includes unit tests for heading hierarchy extraction, line range fidelity, tokenization, Okapi BM25 ranking, and Reciprocal Rank Fusion.

---

## 👤 Author

**Jose Ernesto Torres Zamora**  
*Cloud Solutions Architect & Tech Lead*  
- [GitHub](https://github.com/EreoTorres)
- [LinkedIn](https://linkedin.com/in/jose-ernesto-torres-zamora)

---

## 📄 License

MIT © [Jose Ernesto Torres Zamora](LICENSE)
