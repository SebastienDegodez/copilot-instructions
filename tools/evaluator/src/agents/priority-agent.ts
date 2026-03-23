import type { BenchmarkSummary, BenchmarkEntry, EvaluationResult } from '../core/types.js';
import { logger } from '../utils/logger.js';

export interface PrioritizedAsset {
  id: string;
  kind: string;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  score: number | undefined;
  trend: 'declining' | 'stable' | 'improving' | 'unknown';
}

export interface ResourceAllocation {
  totalAssets: number;
  parallelJobs: number;
  assetsPerJob: number;
  batches: string[][];
}

export interface PriorityAnalysis {
  prioritized: PrioritizedAsset[];
  allocation: ResourceAllocation;
  summary: string;
}

const MAX_PARALLEL_JOBS = 6;
const MIN_ASSETS_PER_JOB = 1;
const DECLINING_THRESHOLD = 0.5;
const FAILING_SCORE_THRESHOLD = 5.0;
const HISTORY_TREND_WINDOW = 3;

function computeTrend(history: BenchmarkEntry['history']): 'declining' | 'stable' | 'improving' | 'unknown' {
  if (history.length < 2) return 'unknown';
  const recent = history.slice(-HISTORY_TREND_WINDOW);
  const first = recent[0]?.overallScore ?? 0;
  const last = recent[recent.length - 1]?.overallScore ?? 0;
  const delta = last - first;
  if (delta <= -DECLINING_THRESHOLD) return 'declining';
  if (delta >= DECLINING_THRESHOLD) return 'improving';
  return 'stable';
}

function computeLatestScore(entry: BenchmarkEntry): number | undefined {
  const latest = entry.history[entry.history.length - 1];
  return latest?.overallScore;
}

function scoreEntryPriority(entry: BenchmarkEntry): { priority: PrioritizedAsset['priority']; reason: string } {
  const latestScore = computeLatestScore(entry);
  const trend = computeTrend(entry.history);

  if (latestScore !== undefined && latestScore < FAILING_SCORE_THRESHOLD) {
    return { priority: 'critical', reason: `Score ${latestScore.toFixed(1)} is below passing threshold` };
  }
  if (trend === 'declining') {
    return { priority: 'high', reason: `Score is declining over last ${HISTORY_TREND_WINDOW} evaluations` };
  }
  if (entry.history.length === 0) {
    return { priority: 'high', reason: 'No evaluation history — new asset' };
  }
  const latest = entry.history[entry.history.length - 1];
  if (latest && latest.passRate < 1.0) {
    return { priority: 'medium', reason: `Pass rate ${(latest.passRate * 100).toFixed(0)}% — some scenarios failing` };
  }
  return { priority: 'low', reason: 'Passing and stable' };
}

function buildAllocation(assets: PrioritizedAsset[], maxJobs: number): ResourceAllocation {
  const total = assets.length;
  if (total === 0) {
    return { totalAssets: 0, parallelJobs: 0, assetsPerJob: 0, batches: [] };
  }

  const parallelJobs = Math.min(maxJobs, Math.max(1, Math.ceil(total / MIN_ASSETS_PER_JOB)));
  const assetsPerJob = Math.ceil(total / parallelJobs);

  const sorted = [...assets].sort((a, b) => {
    const order: Record<PrioritizedAsset['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });

  const batches: string[][] = [];
  for (let i = 0; i < parallelJobs; i++) {
    const batch = sorted.slice(i * assetsPerJob, (i + 1) * assetsPerJob).map((a) => a.id);
    if (batch.length > 0) batches.push(batch);
  }

  return { totalAssets: total, parallelJobs: batches.length, assetsPerJob, batches };
}

/**
 * Analyzes benchmark history to prioritize which assets should be evaluated first
 * and how to allocate them across parallel jobs.
 */
export function analyzePriority(
  summary: BenchmarkSummary,
  candidateIds?: string[],
): PriorityAnalysis {
  const entries = candidateIds
    ? summary.entries.filter((e) => candidateIds.includes(e.id))
    : summary.entries;

  const prioritized: PrioritizedAsset[] = entries.map((entry) => {
    const { priority, reason } = scoreEntryPriority(entry);
    const trend = computeTrend(entry.history);
    return {
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      priority,
      reason,
      score: computeLatestScore(entry),
      trend,
    };
  });

  // Include any candidates that don't exist in the benchmark yet as high priority
  if (candidateIds) {
    const existingIds = new Set(entries.map((e) => e.id));
    for (const id of candidateIds) {
      if (!existingIds.has(id)) {
        const [kind = 'skill', name = id] = id.split(':');
      prioritized.push({
          id,
          kind,
          name,
          priority: 'high',
          reason: 'No evaluation history — new or untracked asset',
          score: undefined,
          trend: 'unknown',
        });
      }
    }
  }

  const allocation = buildAllocation(prioritized, MAX_PARALLEL_JOBS);

  const criticalCount = prioritized.filter((a) => a.priority === 'critical').length;
  const highCount = prioritized.filter((a) => a.priority === 'high').length;
  const summary2 = [
    `${prioritized.length} assets analyzed:`,
    criticalCount > 0 ? `${criticalCount} critical (below threshold)` : null,
    highCount > 0 ? `${highCount} high priority (new or declining)` : null,
    `${allocation.parallelJobs} parallel job(s) recommended`,
  ]
    .filter(Boolean)
    .join(', ');

  logger.info({ criticalCount, highCount, parallelJobs: allocation.parallelJobs }, 'Priority analysis complete');

  return { prioritized, allocation, summary: summary2 };
}

/**
 * Suggests which assets should be re-evaluated based on recent evaluation outcomes.
 */
export function suggestRetests(results: EvaluationResult[]): string[] {
  return results
    .filter((r) => !r.passed || r.overallScore < FAILING_SCORE_THRESHOLD)
    .map((r) => r.id);
}
