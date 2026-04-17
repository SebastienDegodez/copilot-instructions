import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DiscoveredEntry, EvaluationResult } from '../src/core/types.js';

vi.mock('../src/adapters/llm-client.js', () => ({
  createLLMClient: vi.fn(() => ({
    complete: vi.fn(),
    completeWithTools: vi.fn(),
  })),
}));

vi.mock('../src/adapters/file-reader.js', () => ({
  createFileReader: vi.fn(() => ({
    exists: vi.fn().mockReturnValue(true),
    readFile: vi.fn(),
    readFileRelative: vi.fn(),
  })),
}));

vi.mock('../src/core/runner.js', () => ({
  runEvaluation: vi.fn(async (entry: DiscoveredEntry): Promise<EvaluationResult> => ({
    id: entry.id,
    kind: entry.kind,
    name: entry.id.split(':')[1] ?? entry.id,
    assetPath: entry.assetPath,
    model: 'gpt-4o',
    startedAt: '2026-04-17T00:00:00.000Z',
    finishedAt: '2026-04-17T00:00:01.000Z',
    scenarios: [],
    overallScore: 1,
    passRate: 1,
    passed: true,
    skipped: false,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    source: 'manual',
    commitSha: 'test-sha',
  })),
}));

// Imports must come after vi.mock calls
import { createLLMClient } from '../src/adapters/llm-client.js';
import { buildCLI } from '../src/cli.js';

const mockedCreateLLMClient = vi.mocked(createLLMClient);

class ProcessExitError extends Error {
  readonly code: number | string | null | undefined;

  constructor(code: number | string | null | undefined) {
    super(`process.exit:${String(code)}`);
    this.code = code;
  }
}

function writeDiscoveredEntriesFile(rootDir: string): string {
  const entriesPath = join(rootDir, 'discovered.json');
  const entries: { entries: DiscoveredEntry[] } = {
    entries: [
      {
        id: 'skill:evaluate-provider-test',
        kind: 'skill',
        assetPath: 'skills/evaluate-provider-test',
        testPath: 'tests/skills/evaluate-provider-test',
        changedFiles: ['skills/evaluate-provider-test/SKILL.md'],
      },
    ],
  };

  writeFileSync(entriesPath, JSON.stringify(entries, null, 2), 'utf-8');
  return entriesPath;
}

async function runEvaluate(args: string[]): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'evaluator-provider-integration-'));
  const outputDir = join(root, 'results');
  mkdirSync(outputDir, { recursive: true });
  const entriesPath = writeDiscoveredEntriesFile(root);

  try {
    await buildCLI().parseAsync([
      'node',
      'evaluator',
      'evaluate',
      '--entries',
      entriesPath,
      '--output',
      outputDir,
      '--repo-root',
      root,
      ...args,
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

afterEach(() => {
  mockedCreateLLMClient.mockReset();
  vi.restoreAllMocks();
});

describe('evaluate command – provider selection', () => {
  it('uses copilot provider when --provider is omitted', async () => {
    const prev = process.env['COPILOT_GITHUB_TOKEN'];
    process.env['COPILOT_GITHUB_TOKEN'] = 'gh-test-token';

    try {
      await runEvaluate([]);

      expect(mockedCreateLLMClient).toHaveBeenCalledTimes(1);
      expect(mockedCreateLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'copilot' }),
      );
    } finally {
      if (prev === undefined) delete process.env['COPILOT_GITHUB_TOKEN'];
      else process.env['COPILOT_GITHUB_TOKEN'] = prev;
    }
  });

  it('fails when copilot initialization throws and does not fall back to openai', async () => {
    const prev = process.env['COPILOT_GITHUB_TOKEN'];
    process.env['COPILOT_GITHUB_TOKEN'] = 'gh-test-token';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      throw new ProcessExitError(code);
    }) as typeof process.exit);

    mockedCreateLLMClient.mockImplementationOnce((config) => {
      if (config.provider === 'copilot') {
        throw new Error('provider_unavailable: copilot SDK not available');
      }
      return { complete: vi.fn(), completeWithTools: vi.fn() };
    });

    try {
      await expect(runEvaluate([])).rejects.toMatchObject({ code: 1 });

      // createLLMClient must have been called once (for copilot), never for openai
      expect(mockedCreateLLMClient).toHaveBeenCalledTimes(1);
      expect(mockedCreateLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'copilot' }),
      );
      expect(mockedCreateLLMClient).not.toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'openai' }),
      );
    } finally {
      if (prev === undefined) delete process.env['COPILOT_GITHUB_TOKEN'];
      else process.env['COPILOT_GITHUB_TOKEN'] = prev;
      exitSpy.mockRestore();
    }
  });

  it('uses openai provider when --provider openai is provided', async () => {
    const previousKey = process.env['LLM_API_KEY'];
    process.env['LLM_API_KEY'] = 'test-openai-key';

    try {
      await runEvaluate(['--provider', 'openai']);

      expect(mockedCreateLLMClient).toHaveBeenCalledTimes(1);
      expect(mockedCreateLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'openai', apiKey: 'test-openai-key' }),
      );
    } finally {
      if (previousKey === undefined) {
        delete process.env['LLM_API_KEY'];
      } else {
        process.env['LLM_API_KEY'] = previousKey;
      }
    }
  });
});
