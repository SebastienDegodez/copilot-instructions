import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BenchmarkSummary } from '../src/core/types.js';
import type { GitClient } from '../src/adapters/git-client.js';

vi.mock('../src/adapters/git-client.js', () => ({
  createGitClient: vi.fn(),
}));

import { createGitClient } from '../src/adapters/git-client.js';
import { buildCLI } from '../src/cli.js';

const mockedCreateGitClient = vi.mocked(createGitClient);

class ProcessExitError extends Error {
  readonly code: number | string | null | undefined;

  constructor(code: number | string | null | undefined) {
    super(`process.exit:${String(code)}`);
    this.code = code;
  }
}

function makeMockGitClient(files: string[], changedSince: string[] = []): GitClient {
  return {
    getChangedFiles: vi.fn().mockResolvedValue(files),
    getChangedFilesSince: vi.fn().mockResolvedValue(changedSince),
    getCurrentSha: vi.fn().mockResolvedValue('abc1234'),
    getPathDigestAtRef: vi.fn().mockResolvedValue(null),
  };
}

function writeScenarioFile(repoRoot: string, testDir: string): void {
  mkdirSync(join(repoRoot, testDir), { recursive: true });
  writeFileSync(
    join(repoRoot, testDir, 'scenarios.yaml'),
    'scenarios:\n  - name: evaluates asset\n',
    'utf-8',
  );
}

function createRepoWithOnlyNonEvaluableAssets(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'evaluator-discover-command-'));

  mkdirSync(join(repoRoot, '.github', 'workflows'), { recursive: true });
  writeFileSync(
    join(repoRoot, '.github', 'workflows', 'evaluation.yml'),
    'name: Evaluation\non:\n  workflow_dispatch:\njobs: {}\n',
    'utf-8',
  );

  mkdirSync(join(repoRoot, 'skills', 'skill-without-scenarios'), { recursive: true });
  writeFileSync(join(repoRoot, 'skills', 'skill-without-scenarios', 'SKILL.md'), '# Skill without scenarios\n', 'utf-8');

  mkdirSync(join(repoRoot, 'instructions'), { recursive: true });
  writeFileSync(join(repoRoot, 'instructions', 'instruction-without-scenarios.instructions.md'), '# Instruction without scenarios\n', 'utf-8');

  return repoRoot;
}

function createRepoWithMixedEligibilityAssets(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'evaluator-discover-command-'));

  mkdirSync(join(repoRoot, '.github', 'workflows'), { recursive: true });
  writeFileSync(
    join(repoRoot, '.github', 'workflows', 'evaluation.yml'),
    'name: Evaluation\non:\n  workflow_dispatch:\njobs: {}\n',
    'utf-8',
  );

  mkdirSync(join(repoRoot, 'skills', 'eligible-skill'), { recursive: true });
  writeFileSync(join(repoRoot, 'skills', 'eligible-skill', 'SKILL.md'), '# Eligible skill\n', 'utf-8');
  writeScenarioFile(repoRoot, join('tests', 'skills', 'eligible-skill'));

  mkdirSync(join(repoRoot, 'instructions'), { recursive: true });
  writeFileSync(join(repoRoot, 'instructions', 'eligible-instruction.instructions.md'), '# Eligible instruction\n', 'utf-8');
  writeScenarioFile(repoRoot, join('tests', 'instructions', 'eligible-instruction'));

  mkdirSync(join(repoRoot, 'skills', 'skill-without-scenarios'), { recursive: true });
  writeFileSync(join(repoRoot, 'skills', 'skill-without-scenarios', 'SKILL.md'), '# Skill without scenarios\n', 'utf-8');

  writeFileSync(join(repoRoot, 'instructions', 'instruction-without-scenarios.instructions.md'), '# Instruction without scenarios\n', 'utf-8');

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

function _writeSummary(repoRoot: string, entryIds: string[]): string {
  const summaryPath = join(repoRoot, 'summary.json');
  const summary: BenchmarkSummary = {
    lastUpdated: '2026-03-25T00:00:00Z',
    entries: entryIds.map((id) => ({
      id,
      kind: id.startsWith('instruction:') ? 'instruction' : id.startsWith('plugin:') ? 'plugin' : 'skill',
      name: id.split(':')[1] ?? id,
      history: [
        {
          date: '2026-03-24T00:00:00Z',
          commit: { sha: 'abc1234', url: '' },
          model: 'gpt-5.4',
          overallScore: 1,
          passRate: 1,
          scenarios: [],
          tokens: { input: 0, output: 0 },
          source: 'scheduled',
        },
      ],
    })),
  };

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  return summaryPath;
}

async function runDiscoverCommand(options: {
  repoRoot: string;
  gitClient: GitClient;
  args?: string[];
}): Promise<{ result: unknown; exitCode: number | string | null | undefined }> {
  mockedCreateGitClient.mockReturnValue(options.gitClient);

  const outputPath = join(options.repoRoot, 'discovered.json');
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
    throw new ProcessExitError(code);
  }) as typeof process.exit);

  try {
    await buildCLI().parseAsync([
      'node',
      'evaluator',
      'discover',
      '--repo-root',
      options.repoRoot,
      '--output',
      outputPath,
      ...(options.args ?? []),
    ]);

    return {
      result: JSON.parse(readFileSync(outputPath, 'utf-8')),
      exitCode: undefined,
    };
  } catch (error) {
    if (error instanceof ProcessExitError) {
      return {
        result: JSON.parse(readFileSync(outputPath, 'utf-8')),
        exitCode: error.code,
      };
    }

    throw error;
  } finally {
    exitSpy.mockRestore();
  }
}

afterEach(() => {
  mockedCreateGitClient.mockReset();
  vi.restoreAllMocks();
});

describe('discover command', () => {
  it('marks discovery as skipped when no evaluable asset with scenarios needs evaluation', async () => {
    const repoRoot = createRepoWithOnlyNonEvaluableAssets();

    try {
      const { result, exitCode } = await runDiscoverCommand({
        repoRoot,
        gitClient: makeMockGitClient([], []),
        args: ['--all'],
      });

      expect(result).toMatchObject({
        skipped: true,
        entries: [],
      });
      expect(exitCode).toBeUndefined();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('marks discovery as an infrastructure refresh when the evaluation workflow yaml changes', async () => {
    const repoRoot = createRepoWithMixedEligibilityAssets();

    try {
      const { result, exitCode } = await runDiscoverCommand({
        repoRoot,
        gitClient: makeMockGitClient([getCurrentEvaluationWorkflowChange(repoRoot)]),
      });

      expect(result).toMatchObject({
        isInfraChange: true,
        skipped: false,
      });
      expect((result as { entries: Array<{ id: string }> }).entries.map((entry) => entry.id).sort()).toEqual([
        'instruction:eligible-instruction',
        'skill:eligible-skill',
      ]);
      expect(exitCode).toBeUndefined();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('forces all eligible assets into to_evaluate when evaluate_all is enabled', async () => {
    const repoRoot = createRepoWithMixedEligibilityAssets();

    try {
      const { result, exitCode } = await runDiscoverCommand({
        repoRoot,
        gitClient: makeMockGitClient([], []),
        args: ['--all'],
      });

      expect(result).toMatchObject({
        skipped: false,
      });
      expect((result as { entries: Array<{ id: string }> }).entries.map((entry) => entry.id).sort()).toEqual([
        'instruction:eligible-instruction',
        'skill:eligible-skill',
      ]);
      expect(exitCode).toBeUndefined();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});