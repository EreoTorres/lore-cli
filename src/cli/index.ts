#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import { runInit } from './commands/init.js';
import { runIndex } from './commands/index.js';
import { runQuery } from './commands/query.js';
import { runAdd } from './commands/add.js';
import { runStatus } from './commands/status.js';
import { runHookInstall } from './commands/hook.js';
import { startMcpServer } from '../mcp/server.js';

const program = new Command();

program
  .name('lore')
  .description('The institutional memory of your codebase. Zero-config local semantic retrieval & ADR engine.')
  .version('0.1.0');

// init
program
  .command('init')
  .description('Initialize Lore configuration and decisions directory in this repository')
  .option('-f, --force', 'Overwrite existing template files')
  .action(async (options) => {
    try {
      await runInit(options);
    } catch (err) {
      console.error(pc.red('Error initializing:'), (err as Error).message);
      process.exit(1);
    }
  });

// index
program
  .command('index')
  .description('Scan, chunk and semantically index repository docs and ADRs')
  .option('-f, --force', 'Force full re-embedding ignoring cache')
  .option('-v, --verbose', 'Print detailed scanning information')
  .action(async (options) => {
    try {
      await runIndex(options);
    } catch (err) {
      console.error(pc.red('Indexing failed:'), (err as Error).message);
      process.exit(1);
    }
  });

// query / search
program
  .command('query <queryText>')
  .alias('search')
  .description('Search repository lore with hybrid semantic + lexical ranking')
  .option('-k, --top-k <number>', 'Number of results to return', '5')
  .option('--json', 'Output results as JSON')
  .action(async (queryText, options) => {
    try {
      await runQuery(queryText, options);
    } catch (err) {
      console.error(pc.red('Query failed:'), (err as Error).message);
      process.exit(1);
    }
  });

// add
program
  .command('add <title>')
  .description('Record a new Architecture Decision Record (ADR)')
  .option('-s, --status <status>', 'Status of decision: accepted | proposed | deprecated', 'accepted')
  .option('-t, --tag <tags...>', 'Tags for classification')
  .option('-a, --author <author>', 'Author or team name')
  .option('-c, --context <context>', 'Context or problem description')
  .option('--no-index', 'Skip automatic index rebuild after creating ADR')
  .action(async (title, options) => {
    try {
      await runAdd(title, options);
    } catch (err) {
      console.error(pc.red('Failed to add ADR:'), (err as Error).message);
      process.exit(1);
    }
  });

// status
program
  .command('status')
  .description('Show current Lore index statistics and configuration')
  .action(async () => {
    try {
      await runStatus();
    } catch (err) {
      console.error(pc.red('Status check failed:'), (err as Error).message);
      process.exit(1);
    }
  });

// hook
program
  .command('hook')
  .description('Install Git post-commit hook for automated background indexing')
  .action(async () => {
    try {
      await runHookInstall();
    } catch (err) {
      console.error(pc.red('Failed to install Git hook:'), (err as Error).message);
      process.exit(1);
    }
  });

// mcp
program
  .command('mcp')
  .description('Start Model Context Protocol (MCP) server for Cursor, Claude Desktop, and agents')
  .action(async () => {
    try {
      await startMcpServer();
    } catch (err) {
      console.error(pc.red('MCP Server failed:'), (err as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);
