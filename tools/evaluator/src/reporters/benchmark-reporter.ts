import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EvaluationResult, BenchmarkSummary, BenchmarkEntry, BenchmarkHistoryEntry } from '../core/types.js';
import { logger } from '../utils/logger.js';

const REPO_OWNER = 'SebastienDegodez';
const REPO_NAME = 'copilot-instructions';

function buildCommitUrl(sha: string): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${sha}`;
}

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

export function updateBenchmarkSummary(results: EvaluationResult[], outputDir: string): void {
  const summary = loadExistingSummary(outputDir);
  summary.lastUpdated = new Date().toISOString();

  for (const result of results) {
    const historyEntry: BenchmarkHistoryEntry = {
      date: result.finishedAt,
      commit: { sha: result.commitSha, url: buildCommitUrl(result.commitSha) },
      model: result.model,
      overallScore: result.overallScore,
      passRate: result.passRate,
      scenarios: result.scenarios,
      tokens: { input: result.totalTokensInput, output: result.totalTokensOutput },
      source: result.source,
    };

    const existing = summary.entries.find((e) => e.id === result.id);
    if (existing) {
      existing.history.push(historyEntry);
    } else {
      const newEntry: BenchmarkEntry = {
        id: result.id,
        kind: result.kind,
        name: result.name,
        history: [historyEntry],
      };
      summary.entries.push(newEntry);
    }
  }

  const summaryPath = join(outputDir, 'summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  logger.info({ summaryPath, entries: summary.entries.length }, 'Benchmark summary updated');
}
