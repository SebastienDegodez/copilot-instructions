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
  };
}

function makeMockFileReader(content: string): FileReader {
  return {
    readFile: vi.fn().mockResolvedValue(content),
    exists: vi.fn().mockReturnValue(true),
    readFileRelative: vi.fn().mockResolvedValue(content),
  };
}

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
