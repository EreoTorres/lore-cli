import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../core/config.js';
import { VectorStorage } from '../storage/index.js';
import { getEmbedder } from '../embedder/index.js';
import { hybridSearch } from '../search/hybrid.js';
import { runAdd } from '../cli/commands/add.js';

export async function startMcpServer(cwd: string = process.cwd()): Promise<void> {
  const config = loadConfig(cwd);
  const storage = new VectorStorage(config, cwd);

  const server = new Server(
    {
      name: 'lore-mcp-server',
      version: '0.1.0'
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

      await runAdd(title, {
        context,
        tag: tags,
        status,
        index: true
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added and indexed ADR: "${title}"`
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
