# Lore CLI (`lore-cli`)

The institutional memory of your codebase. Zero-config local semantic retrieval & Architecture Decision Record (ADR) engine for engineering teams.

## Comandos Principales
- `npm run dev` — Ejecuta el CLI en modo desarrollo con tsx (`tsx src/cli/index.ts`).
- `npm run build` — Compila TypeScript a JavaScript ESM en `dist/` (`tsc`).
- `npm test` — Ejecuta suite de tests con Vitest (`vitest run`).
- `npm run test:watch` — Tests en modo watch interactivo.
- `npm run typecheck` — Chequeo de tipos estricto sin emitir archivos (`tsc --noEmit`).

## Estructura de Arquitectura (`src/`)
- `cli/`: Configuración de comandos con `commander` y `picocolors`.
  - `commands/init.ts`: Inicializa `.lore/config.json`, `.lore/decisions/` y actualiza `.gitignore`.
  - `commands/index.ts`: Escaneo de archivos, troceado y generación de embeddings con caché incremental SHA-256.
  - `commands/query.ts`: Búsqueda híbrida y visualización formateada con enlaces `file://`.
  - `commands/add.ts`: Creación de nuevos ADRs versionados (`ADR-00X-slug.md`).
  - `commands/hook.ts`: Instalación de Git post-commit hook para re-indexación automática.
  - `commands/status.ts`: Reporte de métricas de almacenamiento e indexación.
- `chunker/`: Parser de Markdown con preservación de jerarquía H1-H3, frontmatter YAML y mapeo de líneas.
- `embedder/`: Abstracción de modelos de embeddings:
  - `local.ts`: Transformers.js ONNX (`Xenova/all-MiniLM-L6-v2`) con descarga con feedback en stderr y caché en `~/.cache/lore/models/`.
  - `providers.ts`: Adaptadores para Ollama y OpenAI.
- `search/`:
  - `math.ts`: Similitud coseno optimizada.
  - `bm25.ts`: Motor de búsqueda léxica Okapi BM25.
  - `hybrid.ts`: Reciprocal Rank Fusion (RRF) combinando vectores + BM25 y extracción de snippets contextuales.
- `storage/`: Persistencia atómica en `.lore/index.json` con cálculo de deltas por hash.
- `mcp/`: Servidor stdio bajo el estándar Model Context Protocol (herramientas: `lore_search`, `lore_add_decision`, `lore_status`).

## Convenciones de Commits
- Prefijos en español: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- Firma en commit: `Ernesto Torres - AAAA-MM-DD`.
- Nunca mencionar herramientas de IA en commits ni PRs.

## Repositorio Remoto
- GitHub: https://github.com/EreoTorres/lore-cli
- Branch principal: `main`
- CI: GitHub Actions (`.github/workflows/ci.yml`) probando Node 18, 20 y 22.
