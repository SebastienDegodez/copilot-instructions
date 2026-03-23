import { Command } from 'commander';
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverChangedEntries, discoverAllEntries } from './core/discoverer.js';
import { runEvaluation } from './core/runner.js';
import { createGitClient } from './adapters/git-client.js';
import { createFileReader } from './adapters/file-reader.js';
import { createLLMClient } from './adapters/llm-client.js';
import { formatMultipleAsJSON } from './reporters/json-reporter.js';
import { generatePRComment } from './reporters/markdown-reporter.js';
import { updateBenchmarkSummary } from './reporters/benchmark-reporter.js';
import { logger } from './utils/logger.js';
import type { DiscoveredEntry, EvaluationResult } from './core/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildCLI(): Command {
  const program = new Command();

  program
    .name('evaluator')
    .description('Automated evaluation pipeline for Copilot skills, plugins, and instructions')
    .version('0.1.0');

  // ── discover ──────────────────────────────────────────────────────────────
  program
    .command('discover')
    .description('Discover changed assets to evaluate')
    .option('--base-ref <ref>', 'Base git ref to compare against', 'origin/main')
    .option('--head-ref <ref>', 'Head git ref', 'HEAD')
    .option('--all', 'Discover all assets regardless of changes', false)
    .option('--repo-root <path>', 'Repository root path', process.cwd())
    .option('--output <path>', 'Output JSON file path', 'discovered.json')
    .action(async (opts: { baseRef: string; headRef: string; all: boolean; repoRoot: string; output: string }) => {
      try {
        const gitClient = createGitClient(opts.repoRoot);
        let result;

        if (opts.all) {
          const entries = await discoverAllEntries(opts.repoRoot);
          result = {
            entries,
            isInfraChange: false,
            skipped: false,
            reason: 'Discovering all assets (--all flag)',
          };
        } else {
          result = await discoverChangedEntries(
            gitClient,
            opts.repoRoot,
            opts.baseRef,
            opts.headRef,
          );
        }

        logger.info(result, 'Discovery complete');
        writeFileSync(opts.output, JSON.stringify(result, null, 2), 'utf-8');
        logger.info({ output: opts.output }, 'Discovery result written');

        if (result.skipped) {
          process.exit(0);
        }
      } catch (err) {
        logger.error({ err }, 'Discovery failed');
        process.exit(1);
      }
    });

  // ── evaluate ──────────────────────────────────────────────────────────────
  program
    .command('evaluate')
    .description('Run evaluation for discovered entries')
    .requiredOption('--entries <path>', 'Path to discovered.json from discover command')
    .option('--model <model>', 'LLM model to use', 'gpt-4o')
    .option('--output <dir>', 'Output directory for results', 'results')
    .option('--repo-root <path>', 'Repository root path', process.cwd())
    .option('--source <source>', 'Evaluation source', 'manual')
    .option('--commit-sha <sha>', 'Commit SHA being evaluated', 'unknown')
    .action(async (opts: { entries: string; model: string; output: string; repoRoot: string; source: string; commitSha: string }) => {
      const apiKey = process.env['LLM_API_KEY'];
      if (!apiKey) {
        logger.error('LLM_API_KEY environment variable is required');
        process.exit(1);
      }

      try {
        const rawEntries = JSON.parse(readFileSync(opts.entries, 'utf-8')) as { entries: DiscoveredEntry[] };
        const entries: DiscoveredEntry[] = rawEntries.entries ?? [];

        if (entries.length === 0) {
          logger.info('No entries to evaluate');
          process.exit(0);
        }

        mkdirSync(opts.output, { recursive: true });
        const llmClient = createLLMClient({ apiKey, model: opts.model });
        const fileReader = createFileReader();
        const results: EvaluationResult[] = [];

        for (const entry of entries) {
          const result = await runEvaluation(entry, llmClient, fileReader, {
            model: opts.model,
            source: opts.source as EvaluationResult['source'],
            commitSha: opts.commitSha,
            repoRoot: opts.repoRoot,
          });
          results.push(result);
          const outputPath = join(opts.output, `${result.id.replace(':', '-')}.json`);
          writeFileSync(outputPath, formatMultipleAsJSON([result]), 'utf-8');
          logger.info({ id: entry.id, outputPath }, 'Result saved');
        }

        const summaryPath = join(opts.output, 'results-summary.json');
        writeFileSync(summaryPath, formatMultipleAsJSON(results), 'utf-8');
        logger.info({ summaryPath, count: results.length }, 'Evaluation complete');
      } catch (err) {
        logger.error({ err }, 'Evaluation failed');
        process.exit(1);
      }
    });

  // ── report ────────────────────────────────────────────────────────────────
  program
    .command('report')
    .description('Generate reports from evaluation results')
    .requiredOption('--results <dir>', 'Directory containing result JSON files')
    .option('--format <format>', 'Report format: markdown | benchmark | json', 'markdown')
    .option('--output <path>', 'Output file or directory path')
    .action(async (opts: { results: string; format: string; output?: string }) => {
      try {
        const resultFiles = readdirSync(opts.results)
          .filter((f) => f.endsWith('.json') && f !== 'results-summary.json' && !f.startsWith('summary'));
        
        const results: EvaluationResult[] = resultFiles.flatMap((f) => {
          const raw = JSON.parse(readFileSync(join(opts.results, f), 'utf-8')) as EvaluationResult[];
          return Array.isArray(raw) ? raw : [raw as EvaluationResult];
        });

        if (opts.format === 'markdown') {
          const markdown = generatePRComment(results);
          const outputPath = opts.output ?? 'pr-comment.md';
          writeFileSync(outputPath, markdown, 'utf-8');
          logger.info({ outputPath }, 'Markdown report written');
        } else if (opts.format === 'benchmark') {
          const outputDir = opts.output ?? 'website/src/data/benchmarks';
          mkdirSync(outputDir, { recursive: true });
          updateBenchmarkSummary(results, outputDir);
          logger.info({ outputDir }, 'Benchmark data updated');
        } else if (opts.format === 'json') {
          const outputPath = opts.output ?? 'report.json';
          writeFileSync(outputPath, formatMultipleAsJSON(results), 'utf-8');
          logger.info({ outputPath }, 'JSON report written');
        } else {
          logger.error({ format: opts.format }, 'Unknown report format');
          process.exit(1);
        }
      } catch (err) {
        logger.error({ err }, 'Report generation failed');
        process.exit(1);
      }
    });

  return program;
}
