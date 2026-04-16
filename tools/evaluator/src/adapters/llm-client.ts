import { createOpenAIClient } from './llm/openai-client.js';
import { createCopilotClient } from './llm/copilot-client.js';

export interface LLMCompletionOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolHandler {
  (args: Record<string, unknown>): Promise<string>;
}

export interface LLMClient {
  complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMResponse>;
  completeWithTools(
    prompt: string,
    tools: ToolDefinition[],
    toolHandlers: Map<string, ToolHandler>,
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse>;
}

export type LLMProvider = 'copilot' | 'openai';

export interface LLMClientConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseURL?: string | undefined;
  workDir?: string | undefined;
  timeoutMs?: number | undefined;
}

export function createLLMClient(config: LLMClientConfig): LLMClient {
  switch (config.provider) {
    case 'openai':
      return createOpenAIClient(config);
    case 'copilot':
      return createCopilotClient(config);
    default:
      throw new Error(`provider_invalid: unsupported provider "${String((config as { provider?: unknown }).provider)}"`);
  }
}
