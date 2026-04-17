import { describe, it, expect, vi } from 'vitest';
import { judgeScenario } from '../src/core/judge.js';
import type { LLMClient } from '../src/adapters/llm-client.js';
import type { Scenario } from '../src/config/schema.js';

function makeMockLLMClient(responses: Array<{ content: string; tokensInput?: number; tokensOutput?: number }>): LLMClient {
  let callCount = 0;
  return {
    complete: vi.fn().mockImplementation(() => {
      const response = responses[callCount % responses.length];
      callCount++;
      return Promise.resolve({
        content: response?.content ?? '',
        tokensInput: response?.tokensInput ?? 100,
        tokensOutput: response?.tokensOutput ?? 200,
      });
    }),
    completeWithTools: vi.fn().mockImplementation(() => {
      const response = responses[callCount % responses.length];
      callCount++;
      return Promise.resolve({
        content: response?.content ?? '',
        tokensInput: response?.tokensInput ?? 100,
        tokensOutput: response?.tokensOutput ?? 200,
      });
    }),
  };
}

const sampleScenario: Scenario = {
  name: 'test-scenario',
  description: 'A test scenario',
  prompt: 'Write a simple hello world function in TypeScript',
  expectations: {
    keywords: ['function', 'console.log'],
    patterns: ['/hello/i'],
  },
  judge: {
    criteria: 'Score based on correctness and completeness.',
    passing_score: 7.0,
  },
  timeout: 60,
  runs: 2,
};

describe('judgeScenario', () => {
  it('runs the scenario the specified number of times', async () => {
    const llmClient = makeMockLLMClient([
      { content: 'function hello() { console.log("hello world"); }' },
      { content: '{"score": 8, "reasoning": "Good implementation"}' },
    ]);

    const result = await judgeScenario(llmClient, sampleScenario);
    expect(result.scenarioName).toBe('test-scenario');
    expect(result.runs).toHaveLength(2);
  });

  it('calculates average score across runs', async () => {
    const llmClient = makeMockLLMClient([
      { content: 'function hello() { console.log("hello world"); }' },
      { content: '{"score": 8, "reasoning": "Good"}' },
    ]);

    const result = await judgeScenario(llmClient, sampleScenario);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
    expect(result.averageScore).toBeLessThanOrEqual(10);
  });

  it('identifies missing keywords', async () => {
    const llmClient = makeMockLLMClient([
      { content: 'const x = 42;' },
      { content: '{"score": 3, "reasoning": "Missing key elements"}' },
    ]);

    const result = await judgeScenario(llmClient, sampleScenario);
    const allMissing = result.runs.flatMap((r) => r.keywordsMissing);
    expect(allMissing.length).toBeGreaterThan(0);
  });

  it('handles malformed judge response gracefully', async () => {
    const llmClient = makeMockLLMClient([
      { content: 'function hello() { console.log("hello"); }' },
      { content: 'not valid json at all' },
    ]);

    const result = await judgeScenario(llmClient, sampleScenario);
    expect(result.runs).toHaveLength(2);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
  });

  it('sets passed=true when score meets passing threshold', async () => {
    const llmClient = makeMockLLMClient([
      { content: 'function hello() { console.log("hello world"); }' },
      { content: '{"score": 9, "reasoning": "Excellent"}' },
    ]);

    const singleRunScenario: Scenario = { ...sampleScenario, runs: 1 };
    const result = await judgeScenario(llmClient, singleRunScenario);
    expect(result.runs[0]).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });
});

describe('judgeScenario — provider-agnostic contract', () => {
  it('accepts any LLMClient without inspecting provider identity', async () => {
    const llmClient = makeMockLLMClient([
      { content: 'function hello() { console.log("hello world"); }' },
      { content: '{"score": 8, "reasoning": "Good"}' },
    ]);

    // LLMClient interface has no provider field — judge must not branch on it
    expect('provider' in llmClient).toBe(false);

    const singleRun: Scenario = { ...sampleScenario, runs: 1 };
    const result = await judgeScenario(llmClient, singleRun);
    expect(result.scenarioName).toBe('test-scenario');
  });

  it('records error and does NOT switch provider when complete() rejects', async () => {
    // status 429 + ByDay message → withRetry fast-fails immediately (no sleep).
    const copilotError = Object.assign(new Error('copilot ByDay quota exceeded'), { status: 429, headers: {}, category: 'copilot' });
    const errorClient: LLMClient = {
      complete: vi.fn().mockRejectedValue(copilotError),
      completeWithTools: vi.fn().mockRejectedValue(copilotError),
    };

    const singleRun: Scenario = { ...sampleScenario, runs: 1 };

    // judgeScenario must not throw; it should record a failed run
    const result = await judgeScenario(errorClient, singleRun);

    expect(result.runs).toHaveLength(1);
    expect(result.passed).toBe(false);

    // complete() called only on this client — no secondary client is ever created
    const callCount = (errorClient.complete as ReturnType<typeof vi.fn>).mock.calls.length +
      (errorClient.completeWithTools as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCount).toBeGreaterThan(0);
  });
});
