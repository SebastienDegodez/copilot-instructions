import type { LLMClient } from '../adapters/llm-client.js';
import type { FileReader } from '../adapters/file-reader.js';
import type { DiscoveredEntry, EvaluationResult, ScenarioResult } from './types.js';
import { ScenariosFileSchema } from '../config/schema.js';
import { judgeScenario } from './judge.js';
import { logger } from '../utils/logger.js';
import { parse } from 'yaml';
import { readdirSync, statSync as _statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Recursively collect all readable files under a directory,
 * returning a map of relative paths to their content.
 */
async function collectAssetFiles(
  assetDir: string,
  fileReader: FileReader,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  if (!fileReader.exists(assetDir)) return files;

  function walk(dir: string): string[] {
    const paths: string[] = [];
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return paths;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, obj, bin, hidden dirs
        if (!entry.name.startsWith('.') && !['node_modules', 'obj', 'bin'].includes(entry.name)) {
          paths.push(...walk(full));
        }
      } else if (entry.isFile() && /\.(md|yaml|yml|cs|ts|json|sh|ps1)$/i.test(entry.name)) {
        paths.push(full);
      }
    }
    return paths;
  }

  for (const fullPath of walk(assetDir)) {
    try {
      const content = await fileReader.readFile(fullPath);
      const relPath = relative(assetDir, fullPath);
      files.set(relPath, content);
    } catch {
      // skip unreadable files
    }
  }

  return files;
}

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
      skipped: true,
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

  // Collect all readable files from the asset directory for tool-based reading
  const assetDir = join(options.repoRoot, entry.assetPath);
  const assetFiles = await collectAssetFiles(assetDir, fileReader);
  logger.info(
    { entry: entry.id, fileCount: assetFiles.size, files: [...assetFiles.keys()] },
    'Collected asset files for read_file tool',
  );

  const scenarioResults: ScenarioResult[] = [];
  for (let i = 0; i < scenariosFile.scenarios.length; i++) {
    const scenario = scenariosFile.scenarios[i]!;
    // Pace requests to avoid per-minute rate limits (10 req/60s)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    const result = await judgeScenario(llmClient, scenario, assetFiles);
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

  // Skipped = every single run across all scenarios was an infrastructure error
  const allRuns = scenarioResults.flatMap((r) => r.runs);
  const skipped = allRuns.length > 0 && allRuns.every((r) => r.error);
  if (skipped) {
    logger.warn({ entry: entry.id }, 'All runs errored — marking evaluation as skipped (excluded from benchmark)');
  }

  const totalTokensInput = allRuns.reduce((sum, run) => sum + run.tokensInput, 0);
  const totalTokensOutput = allRuns.reduce((sum, run) => sum + run.tokensOutput, 0);

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
    skipped,
    totalTokensInput,
    totalTokensOutput,
    source: options.source,
    commitSha: options.commitSha,
  };
}
