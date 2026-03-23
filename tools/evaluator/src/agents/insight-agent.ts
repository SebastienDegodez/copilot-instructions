import type { EvaluationResult, ScenarioResult } from '../core/types.js';
import { logger } from '../utils/logger.js';

export interface FailurePattern {
  pattern: string;
  affectedAssets: string[];
  occurrences: number;
}

export interface ImprovementRecommendation {
  assetId: string;
  issue: string;
  recommendation: string;
}

export interface InsightReport {
  summary: string;
  overallPassRate: number;
  averageScore: number;
  failurePatterns: FailurePattern[];
  recommendations: ImprovementRecommendation[];
  markdownReport: string;
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function detectFailurePatterns(results: EvaluationResult[]): FailurePattern[] {
  const patternMap = new Map<string, Set<string>>();

  for (const result of results) {
    for (const scenario of result.scenarios) {
      if (!scenario.passed) {
        const pattern = `Scenario "${scenario.scenarioName}" failing`;
        if (!patternMap.has(pattern)) patternMap.set(pattern, new Set());
        patternMap.get(pattern)!.add(result.id);
      }

      for (const run of scenario.runs) {
        for (const missing of run.keywordsMissing) {
          const pattern = `Missing keyword: "${missing}"`;
          if (!patternMap.has(pattern)) patternMap.set(pattern, new Set());
          patternMap.get(pattern)!.add(result.id);
        }
      }
    }
  }

  return Array.from(patternMap.entries())
    .map(([pattern, assets]) => ({
      pattern,
      affectedAssets: Array.from(assets),
      occurrences: assets.size,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);
}

const RECOMMENDATION_SCORE_THRESHOLD = 8.0;

function buildRecommendations(results: EvaluationResult[]): ImprovementRecommendation[] {
  const recommendations: ImprovementRecommendation[] = [];

  for (const result of results) {
    if (result.overallScore >= RECOMMENDATION_SCORE_THRESHOLD && result.passRate === 1.0) continue;

    const failingScenarios: ScenarioResult[] = result.scenarios.filter((s) => !s.passed);

    if (failingScenarios.length > 0) {
      const scenarioNames = failingScenarios.map((s) => `"${s.scenarioName}"`).join(', ');
      recommendations.push({
        assetId: result.id,
        issue: `${failingScenarios.length} scenario(s) failing: ${scenarioNames}`,
        recommendation: `Review the failing scenarios and update the asset to better address the evaluated criteria.`,
      });
    }

    const allMissingKeywords = result.scenarios
      .flatMap((s) => s.runs.flatMap((r) => r.keywordsMissing))
      .filter((k, i, arr) => arr.indexOf(k) === i);

    if (allMissingKeywords.length > 0) {
      recommendations.push({
        assetId: result.id,
        issue: `Missing expected keywords: ${allMissingKeywords.slice(0, 5).map((k) => `"${k}"`).join(', ')}`,
        recommendation: `Ensure the asset outputs or references these keywords in its responses to meet evaluation expectations.`,
      });
    }
  }

  return recommendations;
}

function buildMarkdownReport(
  results: EvaluationResult[],
  overallPassRate: number,
  averageScore: number,
  patterns: FailurePattern[],
  recommendations: ImprovementRecommendation[],
  summary: string,
): string {
  const lines: string[] = [];

  lines.push('## 📊 Evaluation Insights');
  lines.push('');
  lines.push(`**${summary}**`);
  lines.push('');

  lines.push('### Results Overview');
  lines.push('');
  lines.push('| Asset | Kind | Score | Pass Rate | Status |');
  lines.push('|-------|------|-------|-----------|--------|');

  for (const r of results) {
    const status = r.passed ? '✅ Passed' : r.overallScore < 5 ? '🔴 Failed' : '⚠️ Partial';
    lines.push(
      `| \`${r.id}\` | ${r.kind} | ${formatScore(r.overallScore)}/10 | ${formatPercent(r.passRate)} | ${status} |`,
    );
  }

  lines.push('');
  lines.push(`**Overall:** ${formatPercent(overallPassRate)} pass rate, avg score ${formatScore(averageScore)}/10`);
  lines.push('');

  if (patterns.length > 0) {
    lines.push('### 🔍 Common Failure Patterns');
    lines.push('');
    for (const p of patterns) {
      lines.push(`- **${p.pattern}** — affects ${p.occurrences} asset(s): ${p.affectedAssets.map((a) => `\`${a}\``).join(', ')}`);
    }
    lines.push('');
  }

  if (recommendations.length > 0) {
    lines.push('### 💡 Improvement Recommendations');
    lines.push('');
    for (const rec of recommendations) {
      lines.push(`#### \`${rec.assetId}\``);
      lines.push(`- **Issue:** ${rec.issue}`);
      lines.push(`- **Recommendation:** ${rec.recommendation}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Analyzes evaluation results to generate insights, identify failure patterns,
 * and produce human-readable reports suitable for PR comments.
 */
export function generateInsights(results: EvaluationResult[]): InsightReport {
  if (results.length === 0) {
    logger.warn('No evaluation results to analyze');
    const empty: InsightReport = {
      summary: 'No evaluation results available.',
      overallPassRate: 0,
      averageScore: 0,
      failurePatterns: [],
      recommendations: [],
      markdownReport: '## 📊 Evaluation Insights\n\nNo evaluation results available.',
    };
    return empty;
  }

  const overallPassRate =
    results.reduce((sum, r) => sum + r.passRate, 0) / results.length;
  const averageScore =
    results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  const summary = [
    `Evaluated ${results.length} asset(s):`,
    `${passedCount} passed`,
    failedCount > 0 ? `${failedCount} failed or partial` : null,
    `avg score ${formatScore(averageScore)}/10`,
  ]
    .filter(Boolean)
    .join(', ');

  const failurePatterns = detectFailurePatterns(results);
  const recommendations = buildRecommendations(results);

  const markdownReport = buildMarkdownReport(
    results,
    overallPassRate,
    averageScore,
    failurePatterns,
    recommendations,
    summary,
  );

  logger.info({ passedCount, failedCount, averageScore, patterns: failurePatterns.length }, 'Insight analysis complete');

  return {
    summary,
    overallPassRate,
    averageScore,
    failurePatterns,
    recommendations,
    markdownReport,
  };
}
