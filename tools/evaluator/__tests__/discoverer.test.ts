import { describe, it, expect, vi, afterAll } from 'vitest';
import { discoverChangedEntries, discoverAllEntries as _discoverAllEntries, filterByPreviousResults } from '../src/core/discoverer.js';
import type { GitClient } from '../src/adapters/git-client.js';
import type { BenchmarkSummary } from '../src/core/types.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readdirSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

function createFixtureRepoWithEvaluationWorkflow(workflowFile = 'evaluation-run.yml'): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'evaluator-discoverer-'));

  mkdirSync(join(repoRoot, '.github', 'workflows'), { recursive: true });
  writeFileSync(
    join(repoRoot, '.github', 'workflows', workflowFile),
    'name: Evaluation\non:\n  workflow_dispatch:\njobs: {}\n',
    'utf-8',
  );

  mkdirSync(join(repoRoot, 'skills', 'my-skill'), { recursive: true });
  writeFileSync(join(repoRoot, 'skills', 'my-skill', 'SKILL.md'), '# My skill\n', 'utf-8');

  // Add test dir so my-skill is eligible for evaluation
  mkdirSync(join(repoRoot, 'tests', 'skills', 'my-skill'), { recursive: true });
  writeFileSync(join(repoRoot, 'tests', 'skills', 'my-skill', 'scenarios.yaml'), 'scenarios:\n  - name: test\n', 'utf-8');

  return repoRoot;
}

function getCurrentEvaluationWorkflowChange(repoRoot: string): string {
  const workflowFile = readdirSync(join(repoRoot, '.github', 'workflows')).find((file) =>
    /^evaluation(?:-run)?\.ya?ml$/.test(file),
  );

  if (!workflowFile) {
    throw new Error('Fixture repo is missing the current evaluation workflow YAML');
  }

  return `.github/workflows/${workflowFile}`;
}

function makeMockGitClient(files: string[], changedSince: string[] = []): GitClient {
  return {
    getChangedFiles: vi.fn().mockResolvedValue(files),
    getChangedFilesSince: vi.fn().mockResolvedValue(changedSince),
    getCurrentSha: vi.fn().mockResolvedValue('abc123'),
    getPathDigestAtRef: vi.fn().mockResolvedValue(null),
  };
}

describe('discoverChangedEntries', () => {
  it('returns skipped=true when no files changed', async () => {
    const gitClient = makeMockGitClient([]);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(true);
    expect(result.entries).toHaveLength(0);
  });

  it('detects changed skill', async () => {
    const gitClient = makeMockGitClient(['skills/my-skill/SKILL.md']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.id).toBe('skill:my-skill');
    expect(result.entries[0]?.kind).toBe('skill');
    expect(result.entries[0]?.assetPath).toBe('skills/my-skill');
  });

  it('detects changed plugin', async () => {
    const gitClient = makeMockGitClient(['plugins/my-plugin/plugin.yaml']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(false);
    expect(result.entries[0]?.id).toBe('plugin:my-plugin');
  });

  it('detects changed instruction', async () => {
    const gitClient = makeMockGitClient(['instructions/clean-architecture.instructions.md']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(false);
    expect(result.entries[0]?.id).toBe('instruction:clean-architecture');
    expect(result.entries[0]?.assetPath).toBe('instructions/clean-architecture.instructions.md');
  });

  it('deduplicates multiple files from same skill', async () => {
    const gitClient = makeMockGitClient([
      'skills/my-skill/SKILL.md',
      'skills/my-skill/references/ref.md',
    ]);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.changedFiles).toHaveLength(2);
  });

  it('triggers infra change when evaluator tool files change', async () => {
    const gitClient = makeMockGitClient(['tools/evaluator/src/index.ts']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.isInfraChange).toBe(true);
  });

  it('triggers infra change when evaluation workflow changes', async () => {
    const gitClient = makeMockGitClient(['.github/workflows/evaluation.yml']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.isInfraChange).toBe(true);
  });

  it('treats the current evaluation workflow yaml seam as an infra change', async () => {
    const repoRoot = createFixtureRepoWithEvaluationWorkflow();

    try {
      const gitClient = makeMockGitClient([getCurrentEvaluationWorkflowChange(repoRoot)]);
      const result = await discoverChangedEntries(gitClient, repoRoot, 'origin/main', 'HEAD');

      expect(result).toMatchObject({
        isInfraChange: true,
        skipped: false,
      });
      expect(result.entries.map((entry) => entry.id)).toEqual(['skill:my-skill']);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('detects tests/ path as triggering skill evaluation', async () => {
    const gitClient = makeMockGitClient(['tests/skills/my-skill/scenarios.yaml']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.entries[0]?.id).toBe('skill:my-skill');
  });

  it('returns skipped=true for non-asset changes', async () => {
    const gitClient = makeMockGitClient(['README.md', 'website/src/pages/index.astro']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(true);
    expect(result.entries).toHaveLength(0);
  });
});

describe('filterByPreviousResults', () => {
  const tmpDir = join(tmpdir(), `evaluator-filter-test-${Date.now()}`);

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSummary(summary: BenchmarkSummary): string {
    mkdirSync(tmpDir, { recursive: true });
    const path = join(tmpDir, 'summary.json');
    writeFileSync(path, JSON.stringify(summary), 'utf-8');
    return path;
  }

  const baseEntries = [
    { id: 'skill:my-skill', kind: 'skill' as const, assetPath: 'skills/my-skill', testPath: 'tests/skills/my-skill', changedFiles: [] },
    { id: 'instruction:clean-architecture', kind: 'instruction' as const, assetPath: 'instructions/clean-architecture.instructions.md', testPath: null, changedFiles: [] },
  ];

  it('includes all entries when no benchmark summary file exists', async () => {
    const gitClient = makeMockGitClient([], []);
    const result = await filterByPreviousResults(baseEntries, join(tmpDir, 'nonexistent-summary.json'), gitClient);
    expect(result).toHaveLength(2);
  });

  it('includes entries with no previous result in benchmark summary', async () => {
    const summaryPath = writeSummary({ lastUpdated: '2026-01-01T00:00:00Z', entries: [] });
    const gitClient = makeMockGitClient([], []);
    const result = await filterByPreviousResults(baseEntries, summaryPath, gitClient);
    expect(result).toHaveLength(2);
  });

  it('excludes entries that have a result and have not changed', async () => {
    const summaryPath = writeSummary({
      lastUpdated: '2026-01-01T00:00:00Z',
      entries: [
        {
          id: 'skill:my-skill',
          kind: 'skill',
          name: 'my-skill',
          history: [{ date: '2026-01-01T00:00:00Z', commit: { sha: 'abc123', url: '' }, model: 'gpt-4o', overallScore: 1, passRate: 1, scenarios: [], tokens: { input: 0, output: 0 }, source: 'scheduled' }],
        },
      ],
    });
    // No changed files since last commit
    const gitClient = makeMockGitClient([], []);
    const result = await filterByPreviousResults(baseEntries, summaryPath, gitClient);
    // Only instruction should remain (no previous result), skill is skipped
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('instruction:clean-architecture');
  });

  it('includes entries that have a result but whose asset has changed', async () => {
    const summaryPath = writeSummary({
      lastUpdated: '2026-01-01T00:00:00Z',
      entries: [
        {
          id: 'skill:my-skill',
          kind: 'skill',
          name: 'my-skill',
          history: [{ date: '2026-01-01T00:00:00Z', commit: { sha: 'abc123', url: '' }, model: 'gpt-4o', overallScore: 1, passRate: 1, scenarios: [], tokens: { input: 0, output: 0 }, source: 'scheduled' }],
        },
      ],
    });
    // Asset file has changed since last evaluated commit
    const gitClient = makeMockGitClient([], ['skills/my-skill/SKILL.md']);
    const result = await filterByPreviousResults(baseEntries, summaryPath, gitClient);
    expect(result).toHaveLength(2);
    const skillEntry = result.find((e) => e.id === 'skill:my-skill');
    expect(skillEntry?.changedFiles).toContain('skills/my-skill/SKILL.md');
  });

  it('includes entries whose test path has changed since last evaluation', async () => {
    const summaryPath = writeSummary({
      lastUpdated: '2026-01-01T00:00:00Z',
      entries: [
        {
          id: 'skill:my-skill',
          kind: 'skill',
          name: 'my-skill',
          history: [{ date: '2026-01-01T00:00:00Z', commit: { sha: 'abc123', url: '' }, model: 'gpt-4o', overallScore: 1, passRate: 1, scenarios: [], tokens: { input: 0, output: 0 }, source: 'scheduled' }],
        },
      ],
    });
    // Only the test path has changed
    const gitClient = makeMockGitClient([], ['tests/skills/my-skill/scenarios.yaml']);
    const result = await filterByPreviousResults(baseEntries, summaryPath, gitClient);
    expect(result).toHaveLength(2);
  });

  it('handles corrupted benchmark summary by treating all entries as new', async () => {
    mkdirSync(tmpDir, { recursive: true });
    const corruptPath = join(tmpDir, 'corrupt-summary.json');
    writeFileSync(corruptPath, 'not-valid-json', 'utf-8');
    const gitClient = makeMockGitClient([], []);
    const result = await filterByPreviousResults(baseEntries, corruptPath, gitClient);
    expect(result).toHaveLength(2);
  });

  it('includes an entry when the previously recorded commit cannot be resolved safely', async () => {
    const summaryPath = writeSummary({
      lastUpdated: '2026-01-01T00:00:00Z',
      entries: [
        {
          id: 'skill:my-skill',
          kind: 'skill',
          name: 'my-skill',
          history: [{ date: '2026-01-01T00:00:00Z', commit: { sha: 'not-a-real-sha', url: '' }, model: 'gpt-4o', overallScore: 1, passRate: 1, scenarios: [], tokens: { input: 0, output: 0 }, source: 'scheduled' }],
        },
      ],
    });
    // Simulate the real git behavior: getChangedFilesSince throws when the SHA cannot be resolved
    const gitClient: GitClient = {
      getChangedFiles: vi.fn().mockResolvedValue([]),
      getChangedFilesSince: vi.fn().mockImplementation((sha: string) => {
        if (sha === 'not-a-real-sha') {
          return Promise.reject(new Error(`fatal: ambiguous argument '${sha}': unknown revision`));
        }
        return Promise.resolve([]);
      }),
      getCurrentSha: vi.fn().mockResolvedValue('abc123'),
      getPathDigestAtRef: vi.fn().mockResolvedValue(null),
    };
    const result = await filterByPreviousResults(baseEntries, summaryPath, gitClient);
    expect(result.find((entry) => entry.id === 'skill:my-skill')).toBeDefined();
  });
});
