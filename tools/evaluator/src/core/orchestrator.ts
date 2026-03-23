import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { BenchmarkSummary, EvaluationResult } from './types.js';
import { analyzePriority, suggestRetests } from '../agents/priority-agent.js';
import { generateInsights } from '../agents/insight-agent.js';
import { logger } from '../utils/logger.js';

export type PipelineStage = 'idle' | 'discovery' | 'evaluation' | 'analysis' | 'publishing' | 'done' | 'error';

export interface PipelineState {
  stage: PipelineStage;
  startedAt: string;
  completedAt?: string;
  discoveredIds: string[];
  evaluatedIds: string[];
  failedIds: string[];
  retryIds: string[];
  results: EvaluationResult[];
  error?: string;
}

export interface OrchestratorOptions {
  benchmarkSummaryPath: string;
  repoSlug?: string;
  maxRetries?: number;
}

function loadBenchmarkSummary(path: string): BenchmarkSummary {
  if (!existsSync(path)) {
    return { lastUpdated: new Date().toISOString(), entries: [] };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as BenchmarkSummary;
  } catch {
    logger.warn({ path }, 'Failed to parse benchmark summary — starting fresh');
    return { lastUpdated: new Date().toISOString(), entries: [] };
  }
}

/**
 * Orchestration engine that coordinates discovery → evaluation → analysis → publishing.
 * Manages job dependencies, retries, and tracks overall pipeline state.
 */
export class Orchestrator {
  private readonly options: Required<OrchestratorOptions>;  private state: PipelineState;

  constructor(options: OrchestratorOptions) {
    this.options = { maxRetries: 2, repoSlug: 'SebastienDegodez/copilot-instructions', ...options };
    this.state = {
      stage: 'idle',
      startedAt: new Date().toISOString(),
      discoveredIds: [],
      evaluatedIds: [],
      failedIds: [],
      retryIds: [],
      results: [],
    };
  }

  getState(): Readonly<PipelineState> {
    return { ...this.state };
  }

  /**
   * Phase 1 — Discovery: analyzes benchmark history to determine which assets to evaluate
   * and returns a prioritized list of asset IDs along with parallel job batches.
   */
  discover(candidateIds: string[]): ReturnType<typeof analyzePriority> {
    this.transition('discovery');
    logger.info({ candidates: candidateIds.length }, 'Starting discovery phase');

    const summary = loadBenchmarkSummary(this.options.benchmarkSummaryPath);
    const analysis = analyzePriority(summary, candidateIds);

    this.state.discoveredIds = analysis.prioritized.map((a) => a.id);
    logger.info({ discovered: this.state.discoveredIds.length, summary: analysis.summary }, 'Discovery complete');
    return analysis;
  }

  /**
   * Phase 2 — Evaluation: records which assets were successfully evaluated and which failed.
   * Call this once per evaluated batch with its results.
   */
  recordResults(results: EvaluationResult[], failedIds: string[] = []): void {
    this.transition('evaluation');

    for (const result of results) {
      this.state.results.push(result);
      this.state.evaluatedIds.push(result.id);
    }

    for (const id of failedIds) {
      if (!this.state.failedIds.includes(id)) {
        this.state.failedIds.push(id);
      }
    }

    logger.info(
      { evaluated: this.state.evaluatedIds.length, failed: this.state.failedIds.length },
      'Results recorded',
    );
  }

  /**
   * Phase 3 — Analysis: generates insights and suggests which assets to retry.
   * Returns the insight report and a list of asset IDs recommended for retry.
   */
  analyze(): ReturnType<typeof generateInsights> & { retryIds: string[] } {
    this.transition('analysis');
    logger.info('Starting analysis phase');

    const insights = generateInsights(this.state.results);
    const retryIds = suggestRetests(this.state.results);

    // Only retry assets that haven't exceeded max retries
    this.state.retryIds = retryIds.filter(
      (id) => !this.state.failedIds.includes(id),
    ).slice(0, this.options.maxRetries);

    logger.info({ retryCount: this.state.retryIds.length }, 'Analysis complete');
    return { ...insights, retryIds: this.state.retryIds };
  }

  /**
   * Phase 4 — Publishing: persists updated benchmark summary to disk.
   * Only writes if there are new results to persist.
   */
  publish(updatedSummaryPath?: string): boolean {
    this.transition('publishing');

    if (this.state.results.length === 0) {
      logger.info('No results to publish');
      this.transition('done');
      return false;
    }

    const outputPath = updatedSummaryPath ?? this.options.benchmarkSummaryPath;
    const summary = loadBenchmarkSummary(this.options.benchmarkSummaryPath);
    summary.lastUpdated = new Date().toISOString();

    for (const result of this.state.results) {
      const existing = summary.entries.find((e) => e.id === result.id);
      const historyEntry = {
        date: result.finishedAt,
        commit: { sha: result.commitSha, url: `https://github.com/${this.options.repoSlug}/commit/${result.commitSha}` },
        model: result.model,
        overallScore: result.overallScore,
        passRate: result.passRate,
        scenarios: result.scenarios,
        tokens: { input: result.totalTokensInput, output: result.totalTokensOutput },
        source: result.source,
      };

      if (existing) {
        existing.history.push(historyEntry);
      } else {
        summary.entries.push({
          id: result.id,
          kind: result.kind,
          name: result.name,
          history: [historyEntry],
        });
      }
    }

    writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
    logger.info({ outputPath, entries: summary.entries.length }, 'Benchmark summary published');

    this.state.completedAt = new Date().toISOString();
    this.transition('done');
    return true;
  }

  /**
   * Marks the pipeline as errored with a descriptive message.
   */
  fail(error: string): void {
    this.state.error = error;
    this.transition('error');
    logger.error({ error }, 'Pipeline failed');
  }

  private transition(next: PipelineStage): void {
    logger.debug({ from: this.state.stage, to: next }, 'Pipeline stage transition');
    this.state.stage = next;
  }
}
