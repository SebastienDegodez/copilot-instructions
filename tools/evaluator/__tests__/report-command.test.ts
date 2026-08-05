import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BenchmarkSummary, EvaluationResult } from '../src/core/types.js';
import { buildCLI } from '../src/cli.js';

function makeResultFile(dir: string, result: EvaluationResult): string {
  const filename = `${result.id.replace(':', '-')}.json`;
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify([result], null, 2), 'utf-8');
  return path;
}

function makeResult(id: string, source: EvaluationResult['source'] = 'pr'): EvaluationResult {
  return {
    id,
    kind: 'skill',
    name: id.split(':')[1] ?? id,
    assetPath: `skills/${id.split(':')[1] ?? id}`,
    model: 'gpt-4o',
    startedAt: '2026-03-25T12:00:00Z',
    finishedAt: '2026-03-25T12:01:00Z',
    scenarios: [],
    overallScore: 1,
    passRate: 1,
    passed: true,
    skipped: false,
    totalTokensInput: 200,
    totalTokensOutput: 80,
    source,
    commitSha: 'bbb222',
  };
}

function writeSummary(dir: string, summary: BenchmarkSummary): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'summary.json');
  writeFileSync(path, JSON.stringify(summary, null, 2), 'utf-8');
  return path;
}

const existingSummary: BenchmarkSummary = {
  lastUpdated: '2026-03-01T00:00:00Z',
  entries: [
    {
      id: 'skill:my-skill',
      kind: 'skill',
      name: 'my-skill',
      history: [
        {
          date: '2026-03-01T00:00:00Z',
          commit: { sha: 'aaa111', url: '' },
          model: 'gpt-4o',
          overallScore: 0.9,
          passRate: 0.9,
          scenarios: [],
          tokens: { input: 100, output: 50 },
          source: 'scheduled',
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('report command (benchmark format)', () => {
  it('does not rewrite summary.json when no fresh results are provided', async () => {
    const root = mkdtempSync(join(tmpdir(), 'evaluator-report-'));
    const resultsDir = join(root, 'results');
    const benchmarkDir = join(root, 'benchmarks');
    mkdirSync(resultsDir, { recursive: true });
    const summaryPath = writeSummary(benchmarkDir, existingSummary);
    const originalMtime = readFileSync(summaryPath).toString();

    try {
      await buildCLI().parseAsync([
        'node',
        'evaluator',
        'report',
        '--results',
        resultsDir,
        '--format',
        'benchmark',
        '--output',
        benchmarkDir,
      ]);

      const after = readFileSync(summaryPath, 'utf-8');
      expect(JSON.parse(after)).toEqual(JSON.parse(originalMtime));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes an updated summary when fresh results are provided', async () => {
    const root = mkdtempSync(join(tmpdir(), 'evaluator-report-'));
    const resultsDir = join(root, 'results');
    const benchmarkDir = join(root, 'benchmarks');
    mkdirSync(resultsDir, { recursive: true });
    writeSummary(benchmarkDir, existingSummary);
    makeResultFile(resultsDir, makeResult('skill:my-skill', 'pr'));

    try {
      await buildCLI().parseAsync([
        'node',
        'evaluator',
        'report',
        '--results',
        resultsDir,
        '--format',
        'benchmark',
        '--output',
        benchmarkDir,
      ]);

      const after = JSON.parse(readFileSync(join(benchmarkDir, 'summary.json'), 'utf-8')) as BenchmarkSummary;
      const entry = after.entries.find((e) => e.id === 'skill:my-skill');
      expect(entry?.history).toHaveLength(2);
      expect(after.lastUpdated).not.toBe(existingSummary.lastUpdated);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('creates summary.json with a new entry when none previously existed', async () => {
    const root = mkdtempSync(join(tmpdir(), 'evaluator-report-'));
    const resultsDir = join(root, 'results');
    const benchmarkDir = join(root, 'benchmarks');
    mkdirSync(resultsDir, { recursive: true });
    mkdirSync(benchmarkDir, { recursive: true });
    makeResultFile(resultsDir, makeResult('skill:brand-new-skill', 'manual'));

    try {
      await buildCLI().parseAsync([
        'node',
        'evaluator',
        'report',
        '--results',
        resultsDir,
        '--format',
        'benchmark',
        '--output',
        benchmarkDir,
      ]);

      const summaryPath = join(benchmarkDir, 'summary.json');
      expect(existsSync(summaryPath)).toBe(true);
      const created = JSON.parse(readFileSync(summaryPath, 'utf-8')) as BenchmarkSummary;
      expect(created.entries).toHaveLength(1);
      expect(created.entries[0]?.id).toBe('skill:brand-new-skill');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
