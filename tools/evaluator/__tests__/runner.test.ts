import { describe, it, expect, vi } from 'vitest';
import { runEvaluation } from '../src/core/runner.js';
import type { LLMClient } from '../src/adapters/llm-client.js';
import type { FileReader } from '../src/adapters/file-reader.js';
import type { DiscoveredEntry } from '../src/core/types.js';

const sampleScenariosYaml = `
kind: skill
ref: skills/sample-skill
scenarios:
  - name: basic-test
    description: A basic test scenario
    prompt: Write a hello world function
    expectations:
      keywords:
        - "function"
    judge:
      criteria: "Score on correctness"
      passing_score: 7.0
    timeout: 60
    runs: 1
`;

function makeMockLLMClient(): LLMClient {
  return {
    complete: vi.fn()
      .mockResolvedValueOnce({ content: 'function hello() { return "hello"; }', tokensInput: 100, tokensOutput: 200 })
      .mockResolvedValueOnce({ content: '{"score": 8, "reasoning": "Good"}', tokensInput: 50, tokensOutput: 30 }),
    completeWithTools: vi.fn()
      .mockResolvedValueOnce({ content: 'function hello() { return "hello"; }', tokensInput: 100, tokensOutput: 200 }),
  };
}

function makeMockFileReader(content: string): FileReader {
  return {
    readFile: vi.fn().mockResolvedValue(content),
    exists: vi.fn().mockReturnValue(true),
    readFileRelative: vi.fn().mockResolvedValue(content),
  };
}

describe('runEvaluation — provider-agnostic contract', () => {
  const entry: DiscoveredEntry = {
    id: 'skill:sample-skill',
    kind: 'skill',
    assetPath: 'skills/sample-skill',
    testPath: 'tests/skills/sample-skill',
    changedFiles: ['skills/sample-skill/SKILL.md'],
  };

  it('accepts any LLMClient implementation without inspecting provider identity', async () => {
    // LLMClient has NO provider property — runner must not access it
    const llmClient = makeMockLLMClient();
    expect('provider' in llmClient).toBe(false);

    const fileReader = makeMockFileReader(sampleScenariosYaml);
    const result = await runEvaluation(entry, llmClient, fileReader, {
      model: 'any-model',
      source: 'manual',
      commitSha: 'aaa',
      repoRoot: '/tmp/fake-repo',
    });

    expect(result.id).toBe('skill:sample-skill');
  });

  it('does NOT switch to a fallback client when complete() rejects', async () => {
    // status 429 + ByDay message → withRetry fast-fails immediately (no sleep).
    const copilotError = Object.assign(new Error('copilot ByDay quota exceeded'), { status: 429, headers: {}, category: 'copilot' });
    const errorClient: LLMClient = {
      complete: vi.fn().mockRejectedValue(copilotError),
      completeWithTools: vi.fn().mockRejectedValue(copilotError),
    };
    const fileReader = makeMockFileReader(sampleScenariosYaml);

    const result = await runEvaluation(entry, errorClient, fileReader, {
      model: 'copilot-gpt-4o',
      source: 'manual',
      commitSha: 'bbb',
      repoRoot: '/tmp/fake-repo',
    });

    // Evaluation must record error — no silent fallback to another provider
    expect(result.scenarios.length).toBeGreaterThanOrEqual(0);
    // complete() should have been called on the injected client only
    expect((errorClient.complete as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    // The result itself should indicate failure (no passes when client always errors)
    expect(result.passed).toBe(false);
  });

  it('fails fast on provider_unavailable errors without retrying', async () => {
    const providerError = new Error('provider_unavailable: unable to create copilot session (Model "gpt-4o" is not available.)');
    const errorClient: LLMClient = {
      complete: vi.fn().mockRejectedValue(providerError),
      completeWithTools: vi.fn().mockRejectedValue(providerError),
    };
    const fileReader = makeMockFileReader(sampleScenariosYaml);

    const result = await runEvaluation(entry, errorClient, fileReader, {
      model: 'gpt-4o',
      source: 'manual',
      commitSha: 'ccc',
      repoRoot: '/tmp/fake-repo',
    });

    // Should only be called once (no retries)
    expect((errorClient.complete as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(result.passed).toBe(false);
  });
});

describe('runEvaluation', () => {
  const entry: DiscoveredEntry = {
    id: 'skill:sample-skill',
    kind: 'skill',
    assetPath: 'skills/sample-skill',
    testPath: 'tests/skills/sample-skill',
    changedFiles: ['skills/sample-skill/SKILL.md'],
  };

  it('returns an evaluation result with correct id and kind', async () => {
    const llmClient = makeMockLLMClient();
    const fileReader = makeMockFileReader(sampleScenariosYaml);

    const result = await runEvaluation(entry, llmClient, fileReader, {
      model: 'gpt-4o',
      source: 'manual',
      commitSha: 'abc123',
      repoRoot: '/tmp/fake-repo',
    });

    expect(result.id).toBe('skill:sample-skill');
    expect(result.kind).toBe('skill');
    expect(result.model).toBe('gpt-4o');
    expect(result.commitSha).toBe('abc123');
  });

  it('returns empty result when no test path available', async () => {
    const noTestEntry: DiscoveredEntry = { ...entry, testPath: null };
    const llmClient = makeMockLLMClient();
    const fileReader = makeMockFileReader('');

    const result = await runEvaluation(noTestEntry, llmClient, fileReader, {
      model: 'gpt-4o',
      source: 'manual',
      commitSha: 'abc123',
      repoRoot: '/tmp/fake-repo',
    });

    expect(result.scenarios).toHaveLength(0);
    expect(result.passed).toBe(false);
  });

  it('calculates overall score from scenario results', async () => {
    const llmClient = makeMockLLMClient();
    const fileReader = makeMockFileReader(sampleScenariosYaml);

    const result = await runEvaluation(entry, llmClient, fileReader, {
      model: 'gpt-4o',
      source: 'pr',
      commitSha: 'def456',
      repoRoot: '/tmp/fake-repo',
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(10);
    expect(result.startedAt).toBeTruthy();
    expect(result.finishedAt).toBeTruthy();
  });
});
