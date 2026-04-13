export type AssetKind = 'skill' | 'plugin' | 'instruction';

export interface DiscoveredEntry {
  id: string;
  kind: AssetKind;
  assetPath: string;
  testPath: string | null;
  changedFiles: string[];
}

export interface DiscoveryResult {
  entries: DiscoveredEntry[];
  isInfraChange: boolean;
  skipped: boolean;
  reason: string;
}

export interface ScenarioRun {
  run: number;
  response: string;
  score: number;
  passed: boolean;
  keywordsFound: string[];
  keywordsMissing: string[];
  tokensInput: number;
  tokensOutput: number;
  /** Set when the run failed due to an API or infrastructure error (not an eval failure). */
  error?: string;
}

export interface ScenarioResult {
  scenarioName: string;
  description: string;
  runs: ScenarioRun[];
  averageScore: number;
  passRate: number;
  passed: boolean;
}

export interface EvaluationResult {
  id: string;
  kind: AssetKind;
  name: string;
  assetPath: string;
  model: string;
  startedAt: string;
  finishedAt: string;
  scenarios: ScenarioResult[];
  overallScore: number;
  passRate: number;
  passed: boolean;
  /** True when all runs errored out (API failure) — result is excluded from the benchmark. */
  skipped: boolean;
  totalTokensInput: number;
  totalTokensOutput: number;
  source: 'pr' | 'scheduled' | 'manual';
  commitSha: string;
}

export interface BenchmarkHistoryEntry {
  date: string;
  commit: { sha: string; url: string };
  model: string;
  overallScore: number;
  passRate: number;
  scenarios: ScenarioResult[];
  tokens: { input: number; output: number };
  source: string;
}

export interface BenchmarkEntry {
  id: string;
  kind: AssetKind;
  name: string;
  history: BenchmarkHistoryEntry[];
}

export interface BenchmarkSummary {
  lastUpdated: string;
  entries: BenchmarkEntry[];
}
