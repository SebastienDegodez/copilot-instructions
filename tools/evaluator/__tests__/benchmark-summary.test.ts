import { describe, expect, it } from 'vitest';
import { mergeBenchmarkSummary } from '../src/core/benchmark-summary.js';
import type { BenchmarkSummary, EvaluationResult } from '../src/core/types.js';

const existingHistory = {
  date: '2026-03-01T00:00:00Z',
  commit: { sha: 'aaa111', url: 'https://github.com/org/repo/commit/aaa111' },
  model: 'gpt-4o',
  overallScore: 0.9,
  passRate: 0.9,
  scenarios: [],
  tokens: { input: 100, output: 50 },
  source: 'scheduled',
};

const existingSummary: BenchmarkSummary = {
  lastUpdated: '2026-03-01T00:00:00Z',
  entries: [
    {
      id: 'skill:setup-husky-dotnet',
      kind: 'skill',
      name: 'setup-husky-dotnet',
      history: [existingHistory],
    },
  ],
};

const emptySummary: BenchmarkSummary = {
  lastUpdated: '2026-03-01T00:00:00Z',
  entries: [],
};

function makeFreshResult(id: string, source: EvaluationResult['source'] = 'pr'): EvaluationResult {
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
    totalTokensInput: 200,
    totalTokensOutput: 80,
    source,
    commitSha: 'bbb222',
  };
}

describe('mergeBenchmarkSummary', () => {
  it('preserves existing entries when no fresh results are provided', () => {
    const { summary, changed } = mergeBenchmarkSummary(existingSummary, []);
    expect(summary.entries).toEqual(existingSummary.entries);
    expect(changed).toBe(false);
  });

  it('does not rewrite lastUpdated when no fresh results are provided', () => {
    const { summary, changed } = mergeBenchmarkSummary(existingSummary, []);
    expect(summary.lastUpdated).toBe(existingSummary.lastUpdated);
    expect(changed).toBe(false);
  });

  it('appends history only for assets that produced fresh results', () => {
    const freshResult = makeFreshResult('skill:setup-husky-dotnet');
    const { summary, changed } = mergeBenchmarkSummary(existingSummary, [freshResult]);
    expect(summary.entries[0]?.history).toHaveLength(2);
    expect(changed).toBe(true);
  });

  it('updates lastUpdated only when changed is true', () => {
    const freshResult = makeFreshResult('skill:setup-husky-dotnet');
    const { summary } = mergeBenchmarkSummary(existingSummary, [freshResult]);
    expect(summary.lastUpdated).not.toBe(existingSummary.lastUpdated);
  });

  it('creates a new entry for an asset not yet in the summary', () => {
    const freshResult = makeFreshResult('skill:new-skill');
    const { summary, changed } = mergeBenchmarkSummary(existingSummary, [freshResult]);
    expect(summary.entries).toHaveLength(2);
    const newEntry = summary.entries.find((e) => e.id === 'skill:new-skill');
    expect(newEntry?.history).toHaveLength(1);
    expect(changed).toBe(true);
  });

  it('keeps source values restricted to scheduled, manual, or pr', () => {
    const freshResult = makeFreshResult('skill:some-skill', 'pr');
    const { summary } = mergeBenchmarkSummary(emptySummary, [freshResult]);
    const source = summary.entries[0]?.history[0]?.source;
    expect(['scheduled', 'manual', 'pr']).toContain(source);
  });

  it('does not mutate the existing summary object', () => {
    const original = JSON.parse(JSON.stringify(existingSummary)) as BenchmarkSummary;
    mergeBenchmarkSummary(existingSummary, [makeFreshResult('skill:setup-husky-dotnet')]);
    expect(existingSummary).toEqual(original);
  });
});
