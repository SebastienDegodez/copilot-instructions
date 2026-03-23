import type { LLMClient } from '../adapters/llm-client.js';
import type { Scenario } from '../config/schema.js';
import type { ScenarioResult, ScenarioRun } from './types.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for AI-generated code. 
You will evaluate code responses based on specific criteria. 
Always respond with a JSON object in the following format:
{
  "score": <number 0-10>,
  "reasoning": "<brief explanation>"
}`;

function buildJudgePrompt(scenario: Scenario, response: string): string {
  return `## Evaluation Task

### Original Prompt
${scenario.prompt}

### AI Response to Evaluate
${response}

### Evaluation Criteria
${scenario.judge.criteria}

### Instructions
Evaluate the response strictly on the provided criteria. 
Respond ONLY with a JSON object: { "score": <0-10>, "reasoning": "<explanation>" }`;
}

function checkKeywords(
  response: string,
  keywords: string[] | undefined,
): { found: string[]; missing: string[] } {
  if (!keywords || keywords.length === 0) {
    return { found: [], missing: [] };
  }
  const found: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (response.includes(kw)) {
      found.push(kw);
    } else {
      missing.push(kw);
    }
  }
  return { found, missing };
}

function checkPatterns(response: string, patterns: string[] | undefined): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.every((patternStr) => {
    const match = /^\/(.+)\/([gimsuy]*)$/.exec(patternStr);
    if (match) {
      const [, source, flags] = match;
      if (!source) return false;
      return new RegExp(source, flags ?? '').test(response);
    }
    return response.includes(patternStr);
  });
}

export async function judgeScenarioRun(
  llmClient: LLMClient,
  scenario: Scenario,
  prompt: string,
  runNumber: number,
): Promise<ScenarioRun> {
  logger.debug({ scenario: scenario.name, run: runNumber }, 'Running scenario');

  const runResponse = await withRetry(() =>
    llmClient.complete(prompt, { maxTokens: 4000, temperature: 0.7 }),
  );

  const responseText = runResponse.content;
  const { found: keywordsFound, missing: keywordsMissing } = checkKeywords(
    responseText,
    scenario.expectations?.keywords,
  );
  const patternsOk = checkPatterns(responseText, scenario.expectations?.patterns);

  let score = 0;
  try {
    const judgePrompt = buildJudgePrompt(scenario, responseText);
    const judgeResponse = await withRetry(() =>
      llmClient.complete(judgePrompt, {
        systemPrompt: JUDGE_SYSTEM_PROMPT,
        maxTokens: 500,
        temperature: 0.0,
      }),
    );
    const parsed: unknown = JSON.parse(judgeResponse.content.trim());
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'score' in parsed &&
      typeof (parsed as Record<string, unknown>)['score'] === 'number'
    ) {
      score = Math.min(10, Math.max(0, (parsed as { score: number }).score));
    }
  } catch (err) {
    logger.warn({ err, scenario: scenario.name, run: runNumber }, 'Failed to parse judge response');
  }

  const keywordBonus = keywordsFound.length > 0 ? (keywordsFound.length / (keywordsFound.length + keywordsMissing.length)) * 1.0 : 0;
  const finalScore = patternsOk ? Math.min(10, score + keywordBonus * 0.5) : score * 0.8;

  return {
    run: runNumber,
    response: responseText,
    score: finalScore,
    passed: finalScore >= scenario.judge.passing_score,
    keywordsFound,
    keywordsMissing,
    tokensInput: runResponse.tokensInput,
    tokensOutput: runResponse.tokensOutput,
  };
}

export async function judgeScenario(
  llmClient: LLMClient,
  scenario: Scenario,
): Promise<ScenarioResult> {
  logger.info({ scenario: scenario.name, runs: scenario.runs }, 'Evaluating scenario');

  const runs: ScenarioRun[] = [];
  for (let i = 1; i <= scenario.runs; i++) {
    const run = await judgeScenarioRun(llmClient, scenario, scenario.prompt, i);
    runs.push(run);
  }

  const averageScore = runs.reduce((sum, r) => sum + r.score, 0) / runs.length;
  const passRate = runs.filter((r) => r.passed).length / runs.length;

  return {
    scenarioName: scenario.name,
    description: scenario.description,
    runs,
    averageScore,
    passRate,
    passed: averageScore >= scenario.judge.passing_score,
  };
}
