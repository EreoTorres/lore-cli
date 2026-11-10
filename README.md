<div align="center">

# 🏛️ Lore

**ADRs you can ask questions to.**  
*Full lifecycle for Architecture Decision Records plus zero-config local hybrid search (BM25 + embeddings), built for engineering teams and AI coding agents.*

[![npm](https://img.shields.io/npm/v/%40ereotorres%2Flore-cli)](https://www.npmjs.com/package/@ereotorres/lore-cli)
[![CI](https://github.com/EreoTorres/lore-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/EreoTorres/lore-cli/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/Node->=18.0.0-green.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Enabled-purple.svg)](https://modelcontextprotocol.io/)

</div>

---

## ⚡ The Problem

Writing Architecture Decision Records is a solved problem: tools like `adr-tools` and `log4brains` have scaffolded ADRs for years. **Finding the right decision six months later is not.**

- *"Why did we choose PostgreSQL with pgvector over a standalone vector database?"*
- *"Didn't we already decide how to handle webhook retries?"*
- *"Is that caching decision still valid, or was it superseded?"*

Grep only works if you remember the exact words. Static ADR sites only work if you remember the decision exists. And your AI coding assistant (Cursor, Claude, Copilot) can't respect decisions it can't find, so it hallucinates patterns that violate team consensus.

**`lore` closes the loop.** It manages the full ADR lifecycle (create, list, supersede, deprecate) and turns your decisions, RFCs, and markdown docs into a local, queryable semantic memory that both humans and AI agents can ask questions to.

---

## ✨ Features

- **📝 Full ADR Lifecycle:** Create (`lore add`), list with relations (`lore list`), supersede with automatic cross-linking (`lore supersede`), and change status (`lore mark`). Everything stays as plain markdown in your repo.
- **🔍 Hybrid Search (RRF):** Combines **Vector Cosine Similarity** (conceptual search) with **Okapi BM25** (exact keyword & technical token matching) using Reciprocal Rank Fusion. Superseded decisions are flagged right in the results.
- **🚀 Zero-Cloud & Zero-Config:** Runs 100% locally with embedded ONNX embeddings via Transformers.js (`all-MiniLM-L6-v2`). No API keys, no Docker, no external services.
- **🤖 Built-in MCP Server (`lore mcp`):** Five tools that let **Claude Desktop**, **Cursor**, and agentic workflows search, list, record, and supersede decisions natively.
- **⚡ Incremental Caching:** Content-hash based delta indexing (SHA-256). Re-indexing an unchanged repository takes under **25 milliseconds**.
- **🔗 Exact Source Links:** Results point to precise file paths and line ranges with clickable `file://` URIs.

### How it compares

| | adr-tools | log4brains | **lore** |
|---|:---:|:---:|:---:|
| Scaffold ADRs | ✅ | ✅ | ✅ |
| Supersede with cross-links | ✅ | ✅ | ✅ |
| Semantic + keyword search | ❌ | ❌ | ✅ |
| AI agent integration (MCP) | ❌ | ❌ | ✅ |
| Zero-config install | bash scripts | Node + static site | single npm package |

---

## 🚀 Quickstart

```bash
npm install -g @ereotorres/lore-cli
# or run one-off: npx @ereotorres/lore-cli init
```

### 1. Initialize Lore in your repository

```bash
lore init
```

This creates `.lore/config.json` and `.lore/decisions/` with your first sample ADR.

### 2. Index your documentation

```bash
lore index
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

### 3. Ask your decisions a question

```bash
lore query "how do we handle background workers and queues"
```

Output:
```text
🔍 Lore Search: "how do we handle background workers and queues"
Found 3 relevant sections across 2 files:

1. [100% match] ADR-002: Migrate background worker to BullMQ and Redis
   Section: ADR-002: Migrate background worker to BullMQ and Redis > Decision
   File:    .lore/decisions/ADR-002-migrate-background-worker-to-bullmq-and-redis.md (lines 7-10)
   Link:    file:///C:/dev/repo/.lore/decisions/ADR-002-migrate-background-worker-to-bullmq-and-redis.md#L7-L10
   Status:  accepted
   Tags:    queue, redis

   "We decided to adopt BullMQ with Redis Streams for asynchronous job processing,
   ensuring at-least-once delivery and distributed concurrency control."
```

### 4. Record a new architectural decision

```bash
lore add "Adopt PostgreSQL with pgvector for semantic search" \
  --tag db \
  --tag rag \
  --status accepted
```

Generates a versioned ADR file (`ADR-003-...`) and automatically re-indexes repository memory in under half a second.

### 5. Manage the decision lifecycle

```bash
# See every decision, its status, and how they relate
lore list

📜 Architecture Decision Records (3)

  ADR-001  proposed    Record Architecture Decisions with Lore  (2026-10-27)
  ADR-002  superseded  Use REST polling for job status  (2026-11-01)  → superseded by ADR-003
  ADR-003  accepted    Adopt WebSockets for job status  (2026-11-10)  ↩ supersedes ADR-002

# Replace a decision: creates the new ADR and cross-links both records
lore supersede 2 "Adopt WebSockets for job status"

# Change a status directly (accepted | proposed | deprecated | superseded)
lore mark 1 deprecated
```

Filter and script with `lore list --status accepted` or `lore list --json`.

### 6. Automated Git Hook (Optional)

```bash
lore hook
```

Installs a lightweight `.git/hooks/post-commit` (or Husky) hook that silently re-indexes repository documentation in the background after each commit.

---

## 🤖 MCP (Model Context Protocol) Integration

`lore` includes a standard Model Context Protocol server. Your AI assistant can consult existing decisions before writing code, and record or supersede decisions you approve during a session.

### Claude Desktop / Cursor Configuration

```json
{
  "mcpServers": {
    "repo-lore": {
      "command": "npx",
      "args": ["-y", "@ereotorres/lore-cli", "mcp"],
      "cwd": "/path/to/your/repository"
    }
  }
}
```

### Available MCP Tools:
- **`lore_search`**: Hybrid semantic + lexical search over all decisions, RFCs, and architecture docs.
- **`lore_list_decisions`**: List every ADR with status, tags, and supersede relations (optionally filtered by status).
- **`lore_add_decision`**: Record an agreed-upon technical decision as a versioned ADR.
- **`lore_supersede_decision`**: Replace an existing decision, cross-linking old and new records.
- **`lore_status`**: Inspect indexed chunk count, files, and last update timestamp.

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

Optional cloud providers (`openai`, `ollama`) can also be configured if your organization standardizes on central embedding endpoints. If you use `openai`, set the key via the `OPENAI_API_KEY` environment variable rather than the config file (config files are usually committed).

---

## 🧪 Testing

```bash
npm test
```

Includes unit tests for heading hierarchy extraction, line range fidelity, frontmatter offsets, chunk overlap, tokenization, Okapi BM25 ranking, Reciprocal Rank Fusion, storage round-trips, and the full ADR lifecycle (supersede linking, status transitions, reference resolution).

---

## 👤 Author

**Jose Ernesto Torres Zamora**  
*Cloud Solutions Architect & Tech Lead*  
- [GitHub](https://github.com/EreoTorres)
- [LinkedIn](https://linkedin.com/in/jose-ernesto-torres-zamora)

---

## 📄 License

MIT © [Jose Ernesto Torres Zamora](LICENSE)
