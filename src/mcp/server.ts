import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';
import { loadConfig } from '../core/config.js';
import { getPackageVersion } from '../core/version.js';
import { listAdrs } from '../core/adr.js';
import { VectorStorage } from '../storage/index.js';
import { getEmbedder } from '../embedder/index.js';
import { hybridSearch } from '../search/hybrid.js';
import { runAdd } from '../cli/commands/add.js';
import { runSupersede } from '../cli/commands/supersede.js';

export async function startMcpServer(cwd: string = process.cwd()): Promise<void> {
  // stdout carries the JSON-RPC stream; any log there corrupts the protocol
  console.log = console.error.bind(console);
  console.info = console.error.bind(console);
  console.warn = console.error.bind(console);

  const config = loadConfig(cwd);
  const storage = new VectorStorage(config, cwd);

  const server = new Server(
    {
      name: 'lore-mcp-server',
      version: getPackageVersion()
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Expose tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'lore_search',
          description:
            'Search the repository institutional memory, architecture decisions (ADRs), RFCs, and design documents using hybrid semantic + lexical search.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The technical question or topic to search (e.g., "auth strategy", "database migration")'
              },
              top_k: {
                type: 'number',
                description: 'Number of results to retrieve (default: 5)'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'lore_status',
          description: 'Get current indexing status and statistics of repository documentation and decisions.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'lore_add_decision',
          description: 'Record a new Architecture Decision Record (ADR) into the repository.',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title of the architecture decision'
              },
              context: {
                type: 'string',
                description: 'Problem statement, context, and motivations'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for classification'
              },
              status: {
                type: 'string',
                enum: ['accepted', 'proposed', 'deprecated', 'superseded'],
                description: 'Status of the decision'
              }
            },
            required: ['title']
          }
        },
        {
          name: 'lore_list_decisions',
          description:
            'List all Architecture Decision Records (ADRs) with their status, tags, dates and supersede relations.',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['accepted', 'proposed', 'deprecated', 'superseded'],
                description: 'Optional filter by decision status'
              }
            }
          }
        },
        {
          name: 'lore_supersede_decision',
          description:
            'Create a new ADR that supersedes an existing one. The old ADR is marked as superseded and both records are linked.',
          inputSchema: {
            type: 'object',
            properties: {
              ref: {
                type: 'string',
                description: 'The ADR to supersede, by number or id (e.g. "3", "003", "ADR-003")'
              },
              title: {
                type: 'string',
                description: 'Title of the new architecture decision'
              },
              context: {
                type: 'string',
                description: 'Problem statement, context, and motivations'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for classification'
              }
            },
            required: ['ref', 'title']
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'lore_status') {
      const stats = storage.getStats();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2)
          }
        ]
      };
    }

    if (name === 'lore_search') {
      const query = (args?.query as string) || '';
      const topK = (args?.top_k as number) || 5;

      const manifest = storage.load();
      if (!manifest || manifest.chunks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Repository index is empty or does not exist. Run "lore index" first.'
            }
          ]
        };
      }

      if (manifest.model !== config.model) {
        return {
          content: [
            {
              type: 'text',
              text: `Index was built with model "${manifest.model}" but the current config uses "${config.model}". Run "lore index --force" to rebuild the index.`
            }
          ]
        };
      }

      const embedder = getEmbedder(config);
      const results = await hybridSearch(query, manifest.chunks, embedder, { topK });

      const textOutput = results.map((r, i) => {
        return `[Match ${i + 1} | Score: ${(r.score * 100).toFixed(0)}%]\n` +
          `File: ${r.chunk.filePath}#L${r.chunk.startLine}-L${r.chunk.endLine}\n` +
          `Title: ${r.chunk.title}\n` +
          `Hierarchy: ${r.chunk.sectionHierarchy.join(' > ')}\n` +
          `Content:\n${r.chunk.content}\n`;
      }).join('\n---\n\n');

      return {
        content: [
          {
            type: 'text',
            text: textOutput || 'No matching results found.'
          }
        ]
      };
    }

    if (name === 'lore_add_decision') {
      const title = args?.title as string;
      const context = args?.context as string | undefined;
      const tags = args?.tags as string[] | undefined;
      const status = args?.status as string | undefined;

      const created = await runAdd(title, {
        context,
        tag: tags,
        status,
        index: true
      }, cwd);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added and indexed ADR-${created.adrNumber}: "${title}"`
          }
        ]
      };
    }

    if (name === 'lore_list_decisions') {
      const decisionsDir = path.resolve(cwd, config.decisionsDir);
      let adrs = listAdrs(decisionsDir);

      const statusFilter = args?.status as string | undefined;
      if (statusFilter) {
        adrs = adrs.filter(a => a.status === statusFilter);
      }

      if (adrs.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: statusFilter
                ? `No ADRs found with status "${statusFilter}".`
                : 'No Architecture Decision Records recorded yet. Use lore_add_decision to create the first one.'
            }
          ]
        };
      }

      const listing = adrs.map(a => ({
        id: `ADR-${a.number}`,
        title: a.title,
        status: a.status,
        date: a.date,
        tags: a.tags,
        file: path.relative(cwd, a.filePath),
        supersedes: a.supersedes,
        supersededBy: a.supersededBy
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(listing, null, 2)
          }
        ]
      };
    }

    if (name === 'lore_supersede_decision') {
      const ref = args?.ref as string;
      const title = args?.title as string;
      const context = args?.context as string | undefined;
      const tags = args?.tags as string[] | undefined;

      const created = await runSupersede(ref, title, {
        context,
        tag: tags,
        index: true
      }, cwd);

      return {
        content: [
          {
            type: 'text',
            text: `Created ADR-${created.adrNumber}: "${title}" superseding ${ref}. The old record was marked as superseded and both are linked.`
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
