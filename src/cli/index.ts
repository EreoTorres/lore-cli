#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import { runInit } from './commands/init.js';
import { runIndex } from './commands/index.js';
import { runQuery } from './commands/query.js';
import { runAdd } from './commands/add.js';
import { runList } from './commands/list.js';
import { runSupersede } from './commands/supersede.js';
import { runMark } from './commands/mark.js';
import { runStatus } from './commands/status.js';
import { runHookInstall } from './commands/hook.js';
import { startMcpServer } from '../mcp/server.js';
import { getPackageVersion } from '../core/version.js';

const program = new Command();

program
  .name('lore')
  .description('The institutional memory of your codebase. Zero-config local semantic retrieval & ADR engine.')
  .version(getPackageVersion());

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

// list
program
  .command('list')
  .alias('ls')
  .description('List all Architecture Decision Records with status and relations')
  .option('-s, --status <status>', 'Filter by status: accepted | proposed | deprecated | superseded')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await runList(options);
    } catch (err) {
      console.error(pc.red('Failed to list ADRs:'), (err as Error).message);
      process.exit(1);
    }
  });

// supersede
program
  .command('supersede <ref> <title>')
  .description('Create a new ADR that supersedes an existing one (e.g. lore supersede 3 "New approach")')
  .option('-t, --tag <tags...>', 'Tags for classification')
  .option('-a, --author <author>', 'Author or team name')
  .option('-c, --context <context>', 'Context or problem description')
  .option('--no-index', 'Skip automatic index rebuild')
  .action(async (ref, title, options) => {
    try {
      await runSupersede(ref, title, options);
    } catch (err) {
      console.error(pc.red('Failed to supersede ADR:'), (err as Error).message);
      process.exit(1);
    }
  });

// mark
program
  .command('mark <ref> <status>')
  .description('Change the status of an ADR: accepted | proposed | deprecated | superseded')
  .option('--no-index', 'Skip automatic index rebuild')
  .action(async (ref, status, options) => {
    try {
      await runMark(ref, status, options);
    } catch (err) {
      console.error(pc.red('Failed to change ADR status:'), (err as Error).message);
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
