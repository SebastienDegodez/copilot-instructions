import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EvaluationResult, BenchmarkSummary } from '../core/types.js';
import { mergeBenchmarkSummary } from '../core/benchmark-summary.js';
import { logger } from '../utils/logger.js';

function loadExistingSummary(outputDir: string): BenchmarkSummary {
  const summaryPath = join(outputDir, 'summary.json');
  if (existsSync(summaryPath)) {
    try {
      const content = readFileSync(summaryPath, 'utf-8');
      return JSON.parse(content) as BenchmarkSummary;
    } catch {
      logger.warn({ summaryPath }, 'Failed to parse existing summary.json — starting fresh');
    }
  }
  return { lastUpdated: new Date().toISOString(), entries: [] };
}

export function updateBenchmarkSummary(
  results: EvaluationResult[],
  outputDir: string,
): { changed: boolean; summaryPath: string } {
  const summaryPath = join(outputDir, 'summary.json');
  const existing = loadExistingSummary(outputDir);
  const { summary, changed } = mergeBenchmarkSummary(existing, results);

  if (!changed) {
    logger.info({ summaryPath }, 'Benchmark summary unchanged — skipping write');
    return { changed: false, summaryPath };
  }

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  logger.info({ summaryPath, entries: summary.entries.length }, 'Benchmark summary updated');
  return { changed: true, summaryPath };
}
