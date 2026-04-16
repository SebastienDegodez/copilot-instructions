import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LLMClient,
  LLMClientConfig,
  ToolDefinition,
  ToolHandler,
} from '../src/adapters/llm-client.js';

const COPILOT_ADAPTER_MODULE = '../src/adapters/llm/copilot-client.js';
const COPILOT_SDK_MODULE = '@github/copilot-sdk';

type SDKUsageData = {
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  cacheWriteInputTokens?: number;
};

type MockSessionOptions = {
  content?: string;
  usage?: SDKUsageData;
  error?: Error;
};

async function loadCopilotClientFactory(): Promise<(config: LLMClientConfig) => LLMClient> {
  const module = await import(COPILOT_ADAPTER_MODULE);
  return (module as { createCopilotClient: (config: LLMClientConfig) => LLMClient }).createCopilotClient;
}

function mockCopilotSdk(opts: MockSessionOptions): void {
  vi.doMock(COPILOT_SDK_MODULE, () => ({
    CopilotClient: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue([]),
      createSession: vi.fn().mockImplementation(async () => {
        const usageHandlers: Array<(event: { data: unknown }) => void> = [];
        return {
          sendAndWait: vi.fn(async () => {
            if (opts.error) throw opts.error;
            // Emit usage event before returning the assistant message
            for (const h of usageHandlers) {
              h({ data: opts.usage ?? {} });
            }
            const content = opts.content ?? '';
            return { type: 'assistant.message', data: { content } };
          }),
          on: vi.fn((eventType: string, handler: (event: { data: unknown }) => void) => {
            if (eventType === 'assistant.usage') {
              usageHandlers.push(handler);
            }
            return () => {};
          }),
          disconnect: vi.fn().mockResolvedValue(undefined),
        };
      }),
    })),
    approveAll: vi.fn(() => ({ kind: 'approved' })),
  }));
}

async function createClientFromMock(opts: MockSessionOptions): Promise<LLMClient> {
  mockCopilotSdk(opts);
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
    const client = await createClientFromMock({
      content: 'Answer from copilot.',
      usage: { inputTokens: 123, outputTokens: 45 },
    });

    await expect(client.complete('Say hello')).resolves.toEqual({
      content: 'Answer from copilot.',
      tokensInput: 123,
      tokensOutput: 45,
    });
  });

  it('ignores cache token fields and persists only input/output totals', async () => {
    const client = await createClientFromMock({
      content: 'Cache-aware response.',
      usage: {
        inputTokens: 200,
        outputTokens: 30,
        cacheCreationInputTokens: 999,
        cacheReadInputTokens: 555,
        cacheWriteInputTokens: 444,
      },
    });

    const result = await client.complete('Summarize cache accounting');

    expect(result.tokensInput).toBe(200);
    expect(result.tokensOutput).toBe(30);
  });

  it('throws provider_timeout when session idle timeout occurs', async () => {
    const client = await createClientFromMock({
      error: new Error('Session idle timeout exceeded while awaiting assistant response'),
    });

    await expect(client.complete('Will this timeout?')).rejects.toThrow(/provider_timeout/);
  });

  it('throws provider_empty_response when assistant content is empty', async () => {
    const client = await createClientFromMock({
      content: '',
      usage: { inputTokens: 70, outputTokens: 12 },
    });

    await expect(client.complete('Return empty content')).rejects.toThrow(/provider_empty_response/);
  });

  it('throws provider_unsupported_operation for completeWithTools with copilot context', async () => {
    const client = await createClientFromMock({
      content: 'noop',
      usage: { inputTokens: 1, outputTokens: 1 },
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