import OpenAI from 'openai';
import { logger } from '../../utils/logger.js';
import type {
  LLMClient,
  LLMClientConfig,
  LLMCompletionOptions,
  LLMResponse,
  ToolDefinition,
  ToolHandler,
} from '../llm-client.js';

export function createOpenAIClient(config: LLMClientConfig): LLMClient {
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    defaultHeaders: {
      'editor-version': 'copilot-cli/2.4.0',
      'editor-plugin-version': 'copilot-cli/2.4.0',
      'openai-intent': 'copilot-cli',
      'user-agent': 'github-copilot-cli/2.4.0',
      'copilot-integration-id': 'copilot-cli',
    },
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

    async completeWithTools(
      prompt: string,
      tools: ToolDefinition[],
      toolHandlers: Map<string, ToolHandler>,
      options: LLMCompletionOptions = {},
    ): Promise<LLMResponse> {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));

      let totalInput = 0;
      let totalOutput = 0;
      const maxRounds = 10;

      for (let round = 0; round < maxRounds; round++) {
        logger.debug({ model: config.model, round, tools: tools.length }, 'LLM tool call');

        const response = await openai.chat.completions.create({
          model: config.model,
          messages,
          tools: openaiTools,
          max_tokens: options.maxTokens ?? 4000,
          temperature: options.temperature ?? 0.7,
        });

        totalInput += response.usage?.prompt_tokens ?? 0;
        totalOutput += response.usage?.completion_tokens ?? 0;

        const choice = response.choices[0];
        if (!choice) break;

        const msg = choice.message;

        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          return {
            content: msg.content ?? '',
            tokensInput: totalInput,
            tokensOutput: totalOutput,
          };
        }

        messages.push(msg);

        for (const toolCall of msg.tool_calls) {
          const handler = toolHandlers.get(toolCall.function.name);
          let result: string;
          if (handler) {
            try {
              const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
              result = await handler(args);
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`;
            }
          } else {
            result = `Error: Unknown tool "${toolCall.function.name}"`;
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }

      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      const lastContent = lastAssistant && 'content' in lastAssistant ? lastAssistant.content : '';
      return {
        content: typeof lastContent === 'string' ? lastContent : '',
        tokensInput: totalInput,
        tokensOutput: totalOutput,
      };
    },
  };
}
