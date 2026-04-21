#!/usr/bin/env node
import {
  chat as chatFn,
  createProvider,
  indexRoot,
  search as searchFn,
  similarFiles,
  Store,
  summarizeFile,
  tagFile,
} from '@afe/core';
import chalk from 'chalk';
import { Command } from 'commander';
import { homedir } from 'node:os';
import path from 'node:path';
import ora from 'ora';

const DATA_DIR = process.env.AFE_DATA_DIR ?? path.join(homedir(), '.ai-file-explorer');

interface RootOptions {
  root: string;
}

function loadStore(opts: RootOptions): Store {
  return new Store({ dataDir: path.join(DATA_DIR, 'indexes'), root: opts.root });
}

function formatScore(n: number): string {
  return chalk.dim(`[${n.toFixed(3)}]`);
}

const program = new Command();
program
  .name('afe')
  .description('AI file explorer CLI (Ollama-powered)')
  .version('0.1.0');

program
  .command('index')
  .argument('<root>', 'root folder to index')
  .description('scan a folder and build the embedding index')
  .action(async (root: string) => {
    const absRoot = path.resolve(root);
    const store = loadStore({ root: absRoot });
    const provider = createProvider();
    const spinner = ora(`Indexing ${absRoot} (${provider.name})…`).start();
    try {
      const result = await indexRoot(store, provider, {
        onProgress: (p) => {
          spinner.text = `Indexed ${p.indexed} · skipped ${p.skipped} · scanned ${p.scanned} — ${path.basename(p.currentPath ?? '')}`;
        },
      });
      spinner.succeed(
        `Indexed ${result.indexed} files (${result.skipped} skipped, ${result.scanned} scanned).`
      );
    } catch (err) {
      spinner.fail(`Indexing failed: ${(err as Error).message}`);
      process.exitCode = 1;
    } finally {
      store.close();
    }
  });

program
  .command('search')
  .argument('<query...>', 'natural-language query')
  .option('-r, --root <root>', 'index root folder', process.cwd())
  .option('-k, --top <n>', 'number of hits', (v) => Number.parseInt(v, 10), 8)
  .description('semantic search across an indexed folder')
  .action(async (queryParts: string[], opts: { root: string; top: number }) => {
    const store = loadStore({ root: opts.root });
    const provider = createProvider();
    const query = queryParts.join(' ');
    const spinner = ora(`Searching for “${query}”…`).start();
    try {
      const hits = await searchFn(store, provider, query, { topK: opts.top });
      spinner.stop();
      if (hits.length === 0) {
        console.log(chalk.yellow('No matches found. Did you run `afe index` first?'));
        return;
      }
      for (const h of hits) {
        console.log(`${formatScore(h.score)} ${chalk.bold(h.file.path)}`);
        console.log(`  ${chalk.dim(h.snippet)}`);
      }
    } catch (err) {
      spinner.fail(`Search failed: ${(err as Error).message}`);
      process.exitCode = 1;
    } finally {
      store.close();
    }
  });

program
  .command('chat')
  .argument('<question...>', 'question about the indexed folder')
  .option('-r, --root <root>', 'index root folder', process.cwd())
  .description('chat with your folder (RAG)')
  .action(async (questionParts: string[], opts: { root: string }) => {
    const store = loadStore({ root: opts.root });
    const provider = createProvider();
    const question = questionParts.join(' ');
    const spinner = ora('Thinking…').start();
    try {
      const res = await chatFn(store, provider, question);
      spinner.stop();
      console.log(chalk.bold('Answer:'));
      console.log(res.answer.trim());
      if (res.sources.length > 0) {
        console.log(`\n${chalk.bold('Sources:')}`);
        res.sources.forEach((s, i) => {
          console.log(`  [${i + 1}] ${s.file.path}`);
        });
      }
    } catch (err) {
      spinner.fail(`Chat failed: ${(err as Error).message}`);
      process.exitCode = 1;
    } finally {
      store.close();
    }
  });

program
  .command('summarize')
  .argument('<file>', 'path to a file to summarize')
  .option('-r, --root <root>', 'index root folder', process.cwd())
  .description('summarize a file')
  .action(async (file: string, opts: { root: string }) => {
    const store = loadStore({ root: opts.root });
    const provider = createProvider();
    const spinner = ora('Summarizing…').start();
    try {
      const summary = await summarizeFile(store, provider, path.resolve(file));
      spinner.stop();
      console.log(summary.trim());
    } catch (err) {
      spinner.fail(`Summarize failed: ${(err as Error).message}`);
      process.exitCode = 1;
    } finally {
      store.close();
    }
  });

program
  .command('tag')
  .argument('<file>', 'path to a file to tag')
  .option('-r, --root <root>', 'index root folder', process.cwd())
  .description('suggest tags for a file')
  .action(async (file: string, opts: { root: string }) => {
    const store = loadStore({ root: opts.root });
    const provider = createProvider();
    const spinner = ora('Tagging…').start();
    try {
      const tags = await tagFile(store, provider, path.resolve(file));
      spinner.stop();
      if (tags.length === 0) console.log(chalk.yellow('(no tags suggested)'));
      else console.log(tags.map((t) => chalk.cyan(`#${t}`)).join(' '));
    } catch (err) {
      spinner.fail(`Tag failed: ${(err as Error).message}`);
      process.exitCode = 1;
    } finally {
      store.close();
    }
  });

program
  .command('similar')
  .argument('<file>', 'path to a file')
  .option('-r, --root <root>', 'index root folder', process.cwd())
  .option('-k, --top <n>', 'number of hits', (v) => Number.parseInt(v, 10), 8)
  .description('find files similar to the given file')
  .action((file: string, opts: { root: string; top: number }) => {
    const store = loadStore({ root: opts.root });
    try {
      const hits = similarFiles(store, path.resolve(file), opts.top);
      if (hits.length === 0) {
        console.log(chalk.yellow('No similar files. Did you index this folder?'));
        return;
      }
      for (const h of hits) {
        console.log(`${formatScore(h.score)} ${chalk.bold(h.file.path)}`);
      }
    } finally {
      store.close();
    }
  });

program.parseAsync().catch((err) => {
  console.error(chalk.red(`Error: ${(err as Error).message}`));
  process.exitCode = 1;
});
