import type { BenchmarkSummary, BenchmarkEntry, BenchmarkHistoryEntry, EvaluationResult } from './types.js';

const REPO_OWNER = 'SebastienDegodez';
const REPO_NAME = 'copilot-instructions';

function buildCommitUrl(sha: string): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${sha}`;
}

export function mergeBenchmarkSummary(
  existing: BenchmarkSummary,
  results: EvaluationResult[],
): { summary: BenchmarkSummary; changed: boolean } {
  if (results.length === 0) {
    return { summary: existing, changed: false };
  }

  // Deep-clone entries to avoid mutating the caller's data
  const entries: BenchmarkEntry[] = existing.entries.map((e) => ({
    ...e,
    history: [...e.history],
  }));

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

    const existing = entries.find((e) => e.id === result.id);
    if (existing) {
      existing.history.push(historyEntry);
    } else {
      entries.push({
        id: result.id,
        kind: result.kind,
        name: result.name,
        history: [historyEntry],
      });
    }
  }

  return {
    summary: {
      lastUpdated: new Date().toISOString(),
      entries,
    },
    changed: true,
  };
}
