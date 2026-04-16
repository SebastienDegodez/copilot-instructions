// @github/copilot-sdk is loaded lazily at module evaluation time so that a missing
// SDK does not prevent other providers (e.g. openai) from loading. The dynamic
// import is wrapped in a try/catch: if the SDK is absent, _createCopilotSession
// remains undefined and createCopilotClient throws provider_unavailable at call time.
type CreateCopilotSessionFn = (options: {
  model: string;
  workDir?: string;
  timeoutMs?: number;
}) => unknown;

let _createCopilotSession: CreateCopilotSessionFn | undefined;
try {
  const sdk = await import('@github/copilot-sdk');
  _createCopilotSession = (sdk as { createCopilotSession: CreateCopilotSessionFn }).createCopilotSession;
} catch {
  // SDK absent — provider_unavailable thrown at createCopilotClient call time
}

import type {
  LLMClient,
  LLMClientConfig,
  LLMCompletionOptions,
  LLMResponse,
  ToolDefinition,
  ToolHandler,
} from '../llm-client.js';

type CopilotUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

type CopilotResponse = {
  assistant?: {
    content?: unknown;
  };
  usage?: CopilotUsage;
  events?: unknown[];
};

type CopilotSession = {
  complete: (request: {
    prompt: string;
    model: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }) => Promise<unknown>;
};

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => extractText(part)).join('');
  }

  if (content && typeof content === 'object') {
    const record = content as Record<string, unknown>;
    if (typeof record['text'] === 'string') {
      return record['text'];
    }
    if (typeof record['content'] === 'string') {
      return record['content'];
    }
  }

  return '';
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|idle timeout/i.test(message);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`provider_timeout: copilot request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function collectResponse(result: unknown): LLMResponse {
  const output: LLMResponse = {
    content: '',
    tokensInput: 0,
    tokensOutput: 0,
  };

  const contentParts: string[] = [];

  const appendFromAssistant = (assistant: unknown): void => {
    if (!assistant || typeof assistant !== 'object') {
      return;
    }

    const text = extractText((assistant as Record<string, unknown>)['content']);
    if (text) {
      contentParts.push(text);
    }
  };

  const appendUsage = (usage: unknown): void => {
    if (!usage || typeof usage !== 'object') {
      return;
    }

    const usageRecord = usage as Record<string, unknown>;
    output.tokensInput += asNumber(usageRecord['inputTokens']);
    output.tokensOutput += asNumber(usageRecord['outputTokens']);
  };

  const appendEvent = (event: unknown): void => {
    if (!event || typeof event !== 'object') {
      return;
    }

    const record = event as Record<string, unknown>;
    appendFromAssistant(record['assistant']);
    appendUsage(record['usage']);

    const deltaText = extractText(record['delta']);
    if (deltaText) {
      contentParts.push(deltaText);
    }

    const contentText = extractText(record['content']);
    if (contentText) {
      contentParts.push(contentText);
    }
  };

  if (result && typeof result === 'object') {
    const response = result as CopilotResponse;
    appendFromAssistant(response.assistant);
    appendUsage(response.usage);

    if (Array.isArray(response.events)) {
      for (const event of response.events) {
        appendEvent(event);
      }
    }
  }

  output.content = contentParts.join('').trim();
  return output;
}

export function createCopilotClient(config: LLMClientConfig): LLMClient {
  const timeoutMs = config.timeoutMs ?? 60000;

  if (!_createCopilotSession) {
    throw new Error('provider_unavailable: @github/copilot-sdk is not available in this environment');
  }

  const createCopilotSession = _createCopilotSession;

  let session: CopilotSession;
  try {
    session = createCopilotSession({
      model: config.model,
      workDir: config.workDir,
      timeoutMs,
    }) as CopilotSession;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`provider_unavailable: unable to initialize copilot session (${message})`);
  }

  return {
    async complete(prompt: string, options: LLMCompletionOptions = {}): Promise<LLMResponse> {
      try {
// systemPrompt is provided per-request to enforce replace semantics:
          // each call supplies its own system prompt rather than appending to a
          // session-level prompt, keeping inference deterministic across calls.
          const result = await withTimeout(
          session.complete({
            prompt,
            model: config.model,
            systemPrompt: options.systemPrompt,
            maxTokens: options.maxTokens,
            temperature: options.temperature,
          }),
          timeoutMs,
        );

        const response = collectResponse(result);

        if (!response.content) {
          throw new Error('provider_empty_response: copilot returned empty assistant content');
        }

        return response;
      } catch (error) {
        if (error instanceof Error && /provider_empty_response/.test(error.message)) {
          throw error;
        }

        if (error instanceof Error && /provider_timeout/.test(error.message)) {
          throw error;
        }

        if (isTimeoutError(error)) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`provider_timeout: copilot request timed out (${message})`);
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: copilot request failed (${message})`);
      }
    },

    async completeWithTools(
      _prompt: string,
      _tools: ToolDefinition[],
      _toolHandlers: Map<string, ToolHandler>,
      _options: LLMCompletionOptions = {},
    ): Promise<LLMResponse> {
      throw new Error(
        'provider_unsupported_operation: copilot provider does not support completeWithTools',
      );
    },
  };
}
