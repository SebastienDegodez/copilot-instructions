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
    defineTool: vi.fn((name: string, config: Record<string, unknown>) => ({
      name,
      ...config,
    })),
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

  it('passes model name directly to the Copilot SDK without mapping', async () => {
    mockCopilotSdk({ content: 'Model response.', usage: { inputTokens: 10, outputTokens: 5 } });
    const createCopilotClient = await loadCopilotClientFactory();
    const client = createCopilotClient({
      provider: 'copilot',
      model: 'gpt-4o',
      workDir: '/tmp/evaluator',
    });

    await client.complete('Hello');

    const sdk = await import(COPILOT_SDK_MODULE) as { CopilotClient: ReturnType<typeof vi.fn> };
    const mockClientInstance = sdk.CopilotClient.mock.results[0]?.value as {
      createSession: ReturnType<typeof vi.fn>;
    };
    expect(mockClientInstance.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
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

  it('completeWithTools registers tools natively on the SDK session', async () => {
    const client = await createClientFromMock({
      content: 'Answer using file context.',
      usage: { inputTokens: 200, outputTokens: 50 },
    });
    const tools: ToolDefinition[] = [
      {
        name: 'read_file',
        description: `Read a documentation file from the skill/plugin. Available files:\nREADME.md\nSKILL.md`,
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
          },
          required: ['path'],
        },
      },
    ];
    const handlers = new Map<string, ToolHandler>();
    handlers.set('read_file', async (args: Record<string, unknown>) => {
      const path = String(args['path'] ?? '');
      if (path === 'README.md') return '# Project README';
      if (path === 'SKILL.md') return '# Skill Definition';
      return `File not found: ${path}`;
    });

    const result = await client.completeWithTools('Use tools', tools, handlers);
    expect(result.content).toBe('Answer using file context.');
    expect(result.tokensInput).toBe(200);
    expect(result.tokensOutput).toBe(50);

    // Verify defineTool was called with our tool definition
    const sdk = await import(COPILOT_SDK_MODULE) as { defineTool: ReturnType<typeof vi.fn> };
    expect(sdk.defineTool).toHaveBeenCalledWith('read_file', expect.objectContaining({
      description: expect.stringContaining('Available files'),
      skipPermission: true,
    }));

    // Verify tools were passed to createSession
    const sdkClient = (await import(COPILOT_SDK_MODULE) as { CopilotClient: ReturnType<typeof vi.fn> }).CopilotClient;
    const mockClientInstance = sdkClient.mock.results[0]?.value as {
      createSession: ReturnType<typeof vi.fn>;
    };
    expect(mockClientInstance.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: 'read_file' }),
        ]),
      }),
    );
  });

  it('completeWithTools passes tools even when no handler is registered', async () => {
    const client = await createClientFromMock({
      content: 'No tools needed.',
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    const tools: ToolDefinition[] = [
      {
        name: 'dummy_tool',
        description: 'Dummy tool for contract test.',
        parameters: {},
      },
    ];
    const handlers = new Map<string, ToolHandler>();

    const result = await client.completeWithTools('Use tools', tools, handlers);
    expect(result.content).toBe('No tools needed.');

    // Verify defineTool was called for the tool
    const sdk = await import(COPILOT_SDK_MODULE) as { defineTool: ReturnType<typeof vi.fn> };
    expect(sdk.defineTool).toHaveBeenCalledWith('dummy_tool', expect.objectContaining({
      description: 'Dummy tool for contract test.',
    }));
  });
});