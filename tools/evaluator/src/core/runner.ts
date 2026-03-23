import type { LLMClient } from '../adapters/llm-client.js';
import type { FileReader } from '../adapters/file-reader.js';
import type { DiscoveredEntry, EvaluationResult, ScenarioResult } from './types.js';
import { ScenariosFileSchema } from '../config/schema.js';
import { judgeScenario } from './judge.js';
import { logger } from '../utils/logger.js';
import { parse } from 'yaml';

export interface RunnerOptions {
  model: string;
  source: EvaluationResult['source'];
  commitSha: string;
  repoRoot: string;
}

export async function runEvaluation(
  entry: DiscoveredEntry,
  llmClient: LLMClient,
  fileReader: FileReader,
  options: RunnerOptions,
): Promise<EvaluationResult> {
  const startedAt = new Date().toISOString();
  logger.info({ entry: entry.id, model: options.model }, 'Starting evaluation');

  if (!entry.testPath) {
    logger.warn({ entry: entry.id }, 'No test path found — skipping');
    const finishedAt = new Date().toISOString();
    return {
      id: entry.id,
      kind: entry.kind,
      name: entry.id.split(':')[1] ?? entry.id,
      assetPath: entry.assetPath,
      model: options.model,
      startedAt,
      finishedAt,
      scenarios: [],
      overallScore: 0,
      passRate: 0,
      passed: false,
      totalTokensInput: 0,
      totalTokensOutput: 0,
      source: options.source,
      commitSha: options.commitSha,
    };
  }

  const scenariosPath = `${entry.testPath}/scenarios.yaml`;
  const scenariosContent = await fileReader.readFile(`${options.repoRoot}/${scenariosPath}`);
  const rawData: unknown = parse(scenariosContent);
  const scenariosFile = ScenariosFileSchema.parse(rawData);

  const scenarioResults: ScenarioResult[] = [];
  for (const scenario of scenariosFile.scenarios) {
    const result = await judgeScenario(llmClient, scenario);
    scenarioResults.push(result);
  }

  const overallScore =
    scenarioResults.length > 0
      ? scenarioResults.reduce((sum, r) => sum + r.averageScore, 0) / scenarioResults.length
      : 0;
  const passRate =
    scenarioResults.length > 0
      ? scenarioResults.filter((r) => r.passed).length / scenarioResults.length
      : 0;
  const passed = passRate === 1.0;

  const totalTokensInput = scenarioResults
    .flatMap((r) => r.runs)
    .reduce((sum, run) => sum + run.tokensInput, 0);
  const totalTokensOutput = scenarioResults
    .flatMap((r) => r.runs)
    .reduce((sum, run) => sum + run.tokensOutput, 0);

  const finishedAt = new Date().toISOString();
  logger.info(
    { entry: entry.id, overallScore, passRate, passed },
    'Evaluation complete',
  );

  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.id.split(':')[1] ?? entry.id,
    assetPath: entry.assetPath,
    model: options.model,
    startedAt,
    finishedAt,
    scenarios: scenarioResults,
    overallScore,
    passRate,
    passed,
    totalTokensInput,
    totalTokensOutput,
    source: options.source,
    commitSha: options.commitSha,
  };
}
