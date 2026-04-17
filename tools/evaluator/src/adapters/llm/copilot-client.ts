// @github/copilot-sdk is loaded lazily at module evaluation time so that a missing
// SDK does not prevent other providers (e.g. openai) from loading. The dynamic
// import is wrapped in a try/catch: if the SDK is absent, _sdk remains undefined
// and createCopilotClient throws provider_unavailable at call time.

type PermissionResult = { kind: string };
type OnPermissionRequest = (req: unknown, inv: unknown) => PermissionResult;

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
};

type SDKClientInstance = {
  start(): Promise<void>;
  stop(): Promise<Error[]>;
  createSession(config: SDKSessionConfig): Promise<SDKSession>;
};

type SDKClientCtor = new (options?: SDKClientOptions) => SDKClientInstance;

type SDKModule = {
  CopilotClient: SDKClientCtor;
  approveAll: OnPermissionRequest;
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

/**
 * The Copilot SDK supports a different model catalog than the raw OpenAI API.
 * Map common OpenAI model names to their Copilot SDK equivalents so the
 * evaluator works out of the box with the workflow's default model (`gpt-4o`).
 */
const COPILOT_MODEL_MAP: Record<string, string> = {
  'gpt-4o': 'gpt-4.1',
  'gpt-4o-mini': 'gpt-4.1-mini',
};

function resolveCopilotModel(model: string): string {
  return COPILOT_MODEL_MAP[model] ?? model;
}

export function createCopilotClient(config: LLMClientConfig): LLMClient {
  const timeoutMs = config.timeoutMs ?? 60000;
  const resolvedModel = resolveCopilotModel(config.model);

  if (!_sdk) {
    throw new Error('provider_unavailable: @github/copilot-sdk is not available in this environment');
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
          model: resolvedModel,
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
      // The Copilot SDK does not support native tool/function calling.
      // Fallback: for the read_file tool (used by the evaluator to provide
      // skill documentation context), pre-call the handler for every available
      // file, embed the contents into the prompt, then delegate to complete().
      // Other tool types are not handled — they will simply be ignored and
      // the prompt is sent as-is.
      const readFileTool = tools.find((t) => t.name === 'read_file');
      const readFileHandler = toolHandlers.get('read_file');

      let enrichedPrompt = prompt;

      if (readFileTool && readFileHandler) {
        // Extract available file paths from the tool description.
        // The description format is set by judge.ts buildReadFileTools():
        //   "Read a documentation file … Available files:\npath1\npath2"
        const descriptionMatch = readFileTool.description.match(/Available files:\n([\s\S]*)/);
        const filePaths = descriptionMatch
          ? descriptionMatch[1].split('\n').map((p) => p.trim()).filter(Boolean)
          : [];

        if (filePaths.length > 0) {
          const fileContents: string[] = [];

          for (const filePath of filePaths) {
            try {
              const content = await readFileHandler({ path: filePath });
              fileContents.push(`--- File: ${filePath} ---\n${content}\n--- End: ${filePath} ---`);
            } catch (err) {
              logger.warn({ err, path: filePath }, 'Skipping file in completeWithTools fallback');
            }
          }

          if (fileContents.length > 0) {
            enrichedPrompt = `${prompt}\n\nThe following reference files are available for context:\n\n${fileContents.join('\n\n')}`;
          }
        }
      }

      return this.complete(enrichedPrompt, options);
    },
  };
}
