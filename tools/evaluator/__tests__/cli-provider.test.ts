import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    startedAt: '2026-04-16T00:00:00.000Z',
    finishedAt: '2026-04-16T00:00:01.000Z',
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

import { createLLMClient } from '../src/adapters/llm-client.js';
import { runEvaluation } from '../src/core/runner.js';
import { logger } from '../src/utils/logger.js';
import { buildCLI } from '../src/cli.js';

const mockedCreateLLMClient = vi.mocked(createLLMClient);
const mockedRunEvaluation = vi.mocked(runEvaluation);

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
        id: 'skill:provider-test',
        kind: 'skill',
        assetPath: 'skills/provider-test',
        testPath: 'tests/skills/provider-test',
        changedFiles: ['skills/provider-test/SKILL.md'],
      },
    ],
  };

  writeFileSync(entriesPath, JSON.stringify(entries, null, 2), 'utf-8');
  return entriesPath;
}

async function runEvaluateCommand(args: string[]): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'evaluator-cli-provider-'));
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

    const summaryPath = join(outputDir, 'results-summary.json');
    expect(readFileSync(summaryPath, 'utf-8')).toContain('provider-test');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function withEnv(key: string, value: string | undefined): () => void {
  const previous = process.env[key];

  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }

  return () => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  };
}

afterEach(() => {
  mockedCreateLLMClient.mockClear();
  mockedRunEvaluation.mockClear();
  vi.restoreAllMocks();
});

describe('evaluate command provider behavior', () => {
  it('uses copilot provider when --provider is omitted', async () => {
    const restoreApiKey = withEnv('LLM_API_KEY', 'openai-key');

    try {
      await runEvaluateCommand([]);

      expect(mockedCreateLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'copilot',
          model: 'gpt-4o',
        }),
      );
    } finally {
      restoreApiKey();
    }
  });

  it('accepts --provider openai', async () => {
    const restoreApiKey = withEnv('LLM_API_KEY', 'openai-key');

    try {
      await runEvaluateCommand(['--provider', 'openai']);

      expect(mockedCreateLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          apiKey: 'openai-key',
        }),
      );
    } finally {
      restoreApiKey();
    }
  });

  it('fails fast for unsupported provider values', async () => {
    const restoreApiKey = withEnv('LLM_API_KEY', 'openai-key');
    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      throw new ProcessExitError(code);
    }) as typeof process.exit);

    try {
      await expect(runEvaluateCommand(['--provider', 'unsupported-provider'])).rejects.toMatchObject({
        code: 1,
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/unsupported provider/i),
      );
    } finally {
      restoreApiKey();
      loggerErrorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it('requires LLM_API_KEY when provider is openai', async () => {
    const restoreApiKey = withEnv('LLM_API_KEY', undefined);
    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      throw new ProcessExitError(code);
    }) as typeof process.exit);

    try {
      await expect(runEvaluateCommand(['--provider', 'openai'])).rejects.toMatchObject({ code: 1 });
      expect(loggerErrorSpy).toHaveBeenCalledWith('LLM_API_KEY environment variable is required');
    } finally {
      restoreApiKey();
      loggerErrorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it('does not require LLM_API_KEY when provider is copilot', async () => {
    const restoreApiKey = withEnv('LLM_API_KEY', undefined);

    try {
      await runEvaluateCommand(['--provider', 'copilot']);

      expect(mockedRunEvaluation).toHaveBeenCalledTimes(1);
      expect(mockedCreateLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'copilot',
        }),
      );
    } finally {
      restoreApiKey();
    }
  });

  it('dispatches omitted --provider evaluate path to copilot factory', async () => {
    const restoreApiKey = withEnv('LLM_API_KEY', 'openai-key');

    try {
      await runEvaluateCommand([]);

      expect(mockedCreateLLMClient).toHaveBeenCalledTimes(1);
      expect(mockedCreateLLMClient.mock.calls[0]?.[0]).toMatchObject({
        provider: 'copilot',
      });
    } finally {
      restoreApiKey();
    }
  });
});
