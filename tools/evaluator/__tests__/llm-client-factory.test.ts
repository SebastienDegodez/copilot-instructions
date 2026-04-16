import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMClient } from '../src/adapters/llm-client.js';

const { mockCreateOpenAIClient } = vi.hoisted(() => ({
  mockCreateOpenAIClient: vi.fn(),
}));

vi.mock('../src/adapters/llm/openai-client.js', () => ({
  createOpenAIClient: mockCreateOpenAIClient,
}));

import { createLLMClient } from '../src/adapters/llm-client.js';

function makeStubClient(): LLMClient {
  return {
    complete: vi.fn(),
    completeWithTools: vi.fn(),
  };
}

describe('createLLMClient provider factory', () => {
  beforeEach(() => {
    mockCreateOpenAIClient.mockReset();
  });

  it('dispatches openai provider to createOpenAIClient', () => {
    const openAIClient = makeStubClient();
    mockCreateOpenAIClient.mockReturnValue(openAIClient);

    const result = createLLMClient({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      baseURL: 'https://example.test',
      timeoutMs: 1500,
    });

    expect(mockCreateOpenAIClient).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      baseURL: 'https://example.test',
      timeoutMs: 1500,
    });
    expect(result).toBe(openAIClient);
  });

  it('throws provider_unavailable for copilot provider placeholder', () => {
    expect(() => {
      createLLMClient({
        provider: 'copilot',
        model: 'gpt-4o',
      });
    }).toThrowError(/provider_unavailable/);
  });

  it('throws provider_invalid for unsupported provider values', () => {
    expect(() => {
      createLLMClient({
        provider: 'unsupported' as unknown as 'copilot' | 'openai',
        model: 'gpt-4o',
      });
    }).toThrowError(/provider_invalid/);
  });
});
