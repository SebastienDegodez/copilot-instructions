// @github/copilot-sdk is loaded lazily at module evaluation time so that a missing
// SDK does not prevent other providers (e.g. openai) from loading. The dynamic
// import is wrapped in a try/catch: if the SDK is absent, _sdk remains undefined
// and createCopilotClient throws provider_unavailable at call time.

type PermissionResult = { kind: string };
type OnPermissionRequest = (req: unknown, inv: unknown) => PermissionResult;

type SDKTool = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  handler: (args: unknown, invocation: unknown) => Promise<unknown> | unknown;
  skipPermission?: boolean;
};

type SDKSession = {
  sendAndWait(opts: { prompt: string }, timeout?: number): Promise<SDKAssistantMessage | undefined>;
  on(eventType: string, handler: (event: { data: unknown }) => void): () => void;
  disconnect(): Promise<void>;
};

type SDKAssistantMessage = {
  type: string;
  data: { content: string };
};

type SDKClientOptions = {
  githubToken?: string;
  useLoggedInUser?: boolean;
  logLevel?: string;
};

type SDKSessionConfig = {
  model?: string;
  systemMessage?: { mode?: string; content?: string };
  onPermissionRequest: OnPermissionRequest;
  infiniteSessions?: { enabled: boolean };
  tools?: SDKTool[];
};

type SDKClientInstance = {
  start(): Promise<void>;
  stop(): Promise<Error[]>;
  createSession(config: SDKSessionConfig): Promise<SDKSession>;
};

type SDKClientCtor = new (options?: SDKClientOptions) => SDKClientInstance;

type DefineToolFn = (name: string, config: {
  description?: string;
  parameters?: Record<string, unknown>;
  handler: (args: unknown, invocation: unknown) => Promise<unknown> | unknown;
  skipPermission?: boolean;
}) => SDKTool;

type SDKModule = {
  CopilotClient: SDKClientCtor;
  approveAll: OnPermissionRequest;
  defineTool: DefineToolFn;
};

let _sdk: SDKModule | undefined;
try {
  const sdk = await import('@github/copilot-sdk');
  const sdkRecord = sdk as unknown as SDKModule;
  if (typeof sdkRecord.CopilotClient === 'function') {
    _sdk = sdkRecord;
  }
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
import { logger } from '../../utils/logger.js';

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|idle timeout/i.test(message);
}

export function createCopilotClient(config: LLMClientConfig): LLMClient {
  const timeoutMs = config.timeoutMs ?? 60000;

  if (!_sdk) {
    throw new Error('provider_unavailable: @github/copilot-sdk is not available in this environment');
  }

  if (config.githubToken !== undefined && config.githubToken.trim() === '') {
    throw new Error('provider_unavailable: githubToken is set but empty — check your COPILOT_GITHUB_TOKEN secret');
  }

  const { CopilotClient: CopilotClientCtor, approveAll } = _sdk;

  return {
    async complete(prompt: string, options: LLMCompletionOptions = {}): Promise<LLMResponse> {
      const clientOptions: SDKClientOptions = config.githubToken !== undefined
        ? { githubToken: config.githubToken, useLoggedInUser: false, logLevel: 'error' }
        : { useLoggedInUser: true, logLevel: 'error' };

      const client = new CopilotClientCtor(clientOptions);

      try {
        await client.start();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: unable to start copilot client (${message})`);
      }

      let session: SDKSession;
      try {
        const sessionConfig: SDKSessionConfig = {
          model: config.model,
          onPermissionRequest: approveAll,
          infiniteSessions: { enabled: false },
          // systemPrompt is provided per-request via replace mode to enforce
          // deterministic inference across calls.
          ...(options.systemPrompt !== undefined
            ? { systemMessage: { mode: 'replace', content: options.systemPrompt } }
            : {}),
        };
        session = await client.createSession(sessionConfig);
      } catch (error) {
        await client.stop().catch(() => {});
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: unable to create copilot session (${message})`);
      }

      let tokensInput = 0;
      let tokensOutput = 0;

      // Collect token usage from assistant.usage events emitted during inference.
      session.on('assistant.usage', (event) => {
        const data = event.data as Record<string, unknown>;
        tokensInput += asNumber(data['inputTokens']);
        tokensOutput += asNumber(data['outputTokens']);
      });

      try {
        const result = await session.sendAndWait({ prompt }, timeoutMs);

        const content = result?.data?.content?.trim() ?? '';
        if (!content) {
          throw new Error('provider_empty_response: copilot returned empty assistant content');
        }

        return { content, tokensInput, tokensOutput };
      } catch (error) {
        if (error instanceof Error && /provider_empty_response/.test(error.message)) {
          throw error;
        }

        if (isTimeoutError(error)) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`provider_timeout: copilot request timed out (${message})`);
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: copilot request failed (${message})`);
      } finally {
        await session.disconnect().catch(() => {});
        await client.stop().catch(() => {});
      }
    },

    async completeWithTools(
      prompt: string,
      tools: ToolDefinition[],
      toolHandlers: Map<string, ToolHandler>,
      options: LLMCompletionOptions = {},
    ): Promise<LLMResponse> {
      // Convert evaluator tool definitions + handlers into SDK Tool objects
      // so the Copilot agent natively calls them during inference.
      const sdkTools: SDKTool[] = tools.map((tool) => {
        const handler = toolHandlers.get(tool.name);
        return _sdk!.defineTool(tool.name, {
          description: tool.description,
          parameters: tool.parameters,
          handler: async (args: unknown) => {
            if (!handler) {
              return `Tool "${tool.name}" has no handler registered.`;
            }
            return handler(args as Record<string, unknown>);
          },
          skipPermission: true,
        });
      });

      const clientOptions: SDKClientOptions = config.githubToken !== undefined
        ? { githubToken: config.githubToken, useLoggedInUser: false, logLevel: 'error' }
        : { useLoggedInUser: true, logLevel: 'error' };

      const client = new CopilotClientCtor(clientOptions);

      try {
        await client.start();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: unable to start copilot client (${message})`);
      }

      let session: SDKSession;
      try {
        const sessionConfig: SDKSessionConfig = {
          model: config.model,
          onPermissionRequest: approveAll,
          infiniteSessions: { enabled: false },
          tools: sdkTools,
          ...(options.systemPrompt !== undefined
            ? { systemMessage: { mode: 'replace', content: options.systemPrompt } }
            : {}),
        };
        session = await client.createSession(sessionConfig);
      } catch (error) {
        await client.stop().catch(() => {});
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: unable to create copilot session (${message})`);
      }

      let tokensInput = 0;
      let tokensOutput = 0;

      session.on('assistant.usage', (event) => {
        const data = event.data as Record<string, unknown>;
        tokensInput += asNumber(data['inputTokens']);
        tokensOutput += asNumber(data['outputTokens']);
      });

      try {
        const result = await session.sendAndWait({ prompt }, timeoutMs);

        const content = result?.data?.content?.trim() ?? '';
        if (!content) {
          throw new Error('provider_empty_response: copilot returned empty assistant content');
        }

        return { content, tokensInput, tokensOutput };
      } catch (error) {
        if (error instanceof Error && /provider_empty_response/.test(error.message)) {
          throw error;
        }

        if (isTimeoutError(error)) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`provider_timeout: copilot request timed out (${message})`);
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provider_unavailable: copilot request failed (${message})`);
      } finally {
        await session.disconnect().catch(() => {});
        await client.stop().catch(() => {});
      }
    },
  };
}
