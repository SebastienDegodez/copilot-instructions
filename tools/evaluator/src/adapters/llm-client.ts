import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

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

export interface LLMClient {
  complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMResponse>;
}

export interface LLMClientConfig {
  apiKey: string;
  model: string;
  baseURL?: string | undefined;
}

export function createLLMClient(config: LLMClientConfig): LLMClient {
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return {
    async complete(prompt: string, options: LLMCompletionOptions = {}): Promise<LLMResponse> {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      logger.debug({ model: config.model, maxTokens: options.maxTokens }, 'LLM call');

      const response = await openai.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: options.maxTokens ?? 4000,
        temperature: options.temperature ?? 0.7,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';
      const tokensInput = response.usage?.prompt_tokens ?? 0;
      const tokensOutput = response.usage?.completion_tokens ?? 0;

      return { content, tokensInput, tokensOutput };
    },
  };
}
