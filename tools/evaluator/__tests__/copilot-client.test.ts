import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LLMClient,
  LLMClientConfig,
  ToolDefinition,
  ToolHandler,
} from '../src/adapters/llm-client.js';

const COPILOT_ADAPTER_MODULE = '../src/adapters/llm/copilot-client.js';
const COPILOT_SDK_MODULE = '@github/copilot-sdk';

type CopilotCompletion = {
  assistant?: {
    content?: string;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    cacheWriteInputTokens?: number;
  };
};

type CopilotSession = {
  complete: (prompt: { prompt: string; model: string }) => Promise<CopilotCompletion>;
};

type CreateCopilotSession = (options: { model: string; workDir?: string; timeoutMs?: number }) => CopilotSession;

async function loadCopilotClientFactory(): Promise<(config: LLMClientConfig) => LLMClient> {
  const module = await import(COPILOT_ADAPTER_MODULE);
  return (module as { createCopilotClient: (config: LLMClientConfig) => LLMClient }).createCopilotClient;
}

function mockCopilotSdkSession(factory: CreateCopilotSession): void {
  vi.doMock(COPILOT_SDK_MODULE, () => ({
    createCopilotSession: vi.fn(factory),
  }));
}

async function createClientFromSession(session: CopilotSession): Promise<LLMClient> {
  mockCopilotSdkSession(() => session);
  const createCopilotClient = await loadCopilotClientFactory();

  return createCopilotClient({
    provider: 'copilot',
    model: 'gpt-4.1',
    workDir: '/tmp/evaluator',
    timeoutMs: 1200,
  });
}

describe('createCopilotClient contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('maps copilot usage input/output to tokensInput/tokensOutput', async () => {
    const client = await createClientFromSession({
      complete: vi.fn(async () => ({
        assistant: { content: 'Answer from copilot.' },
        usage: {
          inputTokens: 123,
          outputTokens: 45,
        },
      })),
    });

    await expect(client.complete('Say hello')).resolves.toEqual({
      content: 'Answer from copilot.',
      tokensInput: 123,
      tokensOutput: 45,
    });
  });

  it('ignores cache token fields and persists only input/output totals', async () => {
    const client = await createClientFromSession({
      complete: vi.fn(async () => ({
        assistant: { content: 'Cache-aware response.' },
        usage: {
          inputTokens: 200,
          outputTokens: 30,
          cacheCreationInputTokens: 999,
          cacheReadInputTokens: 555,
          cacheWriteInputTokens: 444,
        },
      })),
    });

    const result = await client.complete('Summarize cache accounting');

    expect(result.tokensInput).toBe(200);
    expect(result.tokensOutput).toBe(30);
  });

  it('throws provider_timeout when session idle timeout occurs', async () => {
    const client = await createClientFromSession({
      complete: vi.fn(async () => {
        throw new Error('Session idle timeout exceeded while awaiting assistant response');
      }),
    });

    await expect(client.complete('Will this timeout?')).rejects.toThrow(/provider_timeout/);
  });

  it('throws provider_empty_response when assistant content is empty', async () => {
    const client = await createClientFromSession({
      complete: vi.fn(async () => ({
        assistant: { content: '' },
        usage: {
          inputTokens: 70,
          outputTokens: 12,
        },
      })),
    });

    await expect(client.complete('Return empty content')).rejects.toThrow(/provider_empty_response/);
  });

  it('throws provider_unsupported_operation for completeWithTools with copilot context', async () => {
    const client = await createClientFromSession({
      complete: vi.fn(async () => ({
        assistant: { content: 'noop' },
        usage: {
          inputTokens: 1,
          outputTokens: 1,
        },
      })),
    });
    const tools: ToolDefinition[] = [
      {
        name: 'dummy_tool',
        description: 'Dummy tool for contract test.',
        parameters: {},
      },
    ];
    const handlers = new Map<string, ToolHandler>();

    await expect(
      client.completeWithTools('Use tools', tools, handlers),
    ).rejects.toThrow(/provider_unsupported_operation/);
    await expect(
      client.completeWithTools('Use tools', tools, handlers),
    ).rejects.toThrow(/copilot/i);
    await expect(
      client.completeWithTools('Use tools', tools, handlers),
    ).rejects.toThrow(/completeWithTools/);
  });
});