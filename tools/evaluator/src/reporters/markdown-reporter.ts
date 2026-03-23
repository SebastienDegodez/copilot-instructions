import type { EvaluationResult } from '../core/types.js';

function formatScore(score: number): string {
  return score.toFixed(2);
}

function passFailBadge(passed: boolean): string {
  return passed ? '✅ PASS' : '❌ FAIL';
}

function formatPassRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function generatePRComment(results: EvaluationResult[]): string {
  if (results.length === 0) {
    return '## 🤖 Evaluation Results\n\nNo evaluations were run.';
  }

  const allPassed = results.every((r) => r.passed);
  const overallBadge = allPassed ? '✅ All evaluations passed' : '❌ Some evaluations failed';
  const totalEntries = results.length;
  const passedEntries = results.filter((r) => r.passed).length;

  const lines: string[] = [
    '## 🤖 Evaluation Results',
    '',
    `**${overallBadge}** — ${passedEntries}/${totalEntries} assets passed`,
    '',
    '| Asset | Kind | Score | Pass Rate | Status |',
    '|-------|------|-------|-----------|--------|',
  ];

  for (const result of results) {
    lines.push(
      `| \`${result.name}\` | ${result.kind} | ${formatScore(result.overallScore)}/10 | ${formatPassRate(result.passRate)} | ${passFailBadge(result.passed)} |`,
    );
  }

  lines.push('', '### Scenario Details', '');

  for (const result of results) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>${result.name}</strong> (${result.kind}) — ${passFailBadge(result.passed)}</summary>`, '');
    lines.push(`**Model:** \`${result.model}\``);
    lines.push(`**Overall Score:** ${formatScore(result.overallScore)}/10`);
    lines.push(`**Pass Rate:** ${formatPassRate(result.passRate)}`, '');

    for (const scenario of result.scenarios) {
      lines.push(`#### ${scenario.scenarioName}`);
      lines.push(`> ${scenario.description}`, '');
      lines.push(`| Run | Score | Passed |`);
      lines.push(`|-----|-------|--------|`);
      for (const run of scenario.runs) {
        lines.push(`| ${run.run} | ${formatScore(run.score)}/10 | ${run.passed ? '✅' : '❌'} |`);
      }
      if (scenario.runs.some((r) => r.keywordsMissing.length > 0)) {
        const missing = [...new Set(scenario.runs.flatMap((r) => r.keywordsMissing))];
        lines.push(``, `**Missing keywords:** ${missing.map((k) => `\`${k}\``).join(', ')}`);
      }
      lines.push('');
    }

    lines.push(`</details>`, '');
  }

  const totalInput = results.reduce((sum, r) => sum + r.totalTokensInput, 0);
  const totalOutput = results.reduce((sum, r) => sum + r.totalTokensOutput, 0);
  lines.push('---');
  lines.push(`*Tokens used: ${totalInput.toLocaleString()} input, ${totalOutput.toLocaleString()} output*`);

  return lines.join('\n');
}
