import type { EvaluationResult } from '../core/types.js';

function formatScore(score: number): string {
  return score.toFixed(2);
}

function passFailBadge(passed: boolean, skipped?: boolean): string {
  if (skipped) return '⚠️ SKIPPED';
  return passed ? '✅ PASS' : '❌ FAIL';
}

function formatPassRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function generatePRComment(results: EvaluationResult[]): string {
  if (results.length === 0) {
    return '## 🤖 Evaluation Results\n\nNo evaluations were run.';
  }

  const allPassed = results.every((r) => r.passed || r.skipped);
  const skippedEntries = results.filter((r) => r.skipped).length;
  const overallBadge = allPassed ? '✅ All evaluations passed' : '❌ Some evaluations failed';
  const totalEntries = results.length;
  const passedEntries = results.filter((r) => r.passed).length;
  const skippedNote = skippedEntries > 0 ? ` (${skippedEntries} skipped due to API errors — not counted)` : '';

  const lines: string[] = [
    '## 🤖 Evaluation Results',
    '',
    `**${overallBadge}** — ${passedEntries}/${totalEntries - skippedEntries} assets passed${skippedNote}`,
    '',
    '| Asset | Kind | Score | Pass Rate | Status |',
    '|-------|------|-------|-----------|--------|',
  ];

  for (const result of results) {
    lines.push(
      `| \`${result.name}\` | ${result.kind} | ${result.skipped ? 'N/A' : `${formatScore(result.overallScore)}/10`} | ${result.skipped ? 'N/A' : formatPassRate(result.passRate)} | ${passFailBadge(result.passed, result.skipped)} |`,
    );
  }

  lines.push('', '### Scenario Details', '');

  for (const result of results) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>${result.name}</strong> (${result.kind}) — ${passFailBadge(result.passed, result.skipped)}</summary>`, '');

    if (result.skipped) {
      lines.push(`> ⚠️ All runs failed due to API errors — evaluation was skipped and is not counted in the benchmark.`, '');
      lines.push(`</details>`, '');
      continue;
    }
    lines.push(`**Model:** \`${result.model}\``);
    lines.push(`**Overall Score:** ${formatScore(result.overallScore)}/10`);
    lines.push(`**Pass Rate:** ${formatPassRate(result.passRate)}`, '');

    for (const scenario of result.scenarios) {
      lines.push(`#### ${scenario.scenarioName}`);
      lines.push(`> ${scenario.description}`, '');
      lines.push(`| Run | Score | Passed |`);
      lines.push(`|-----|-------|--------|`);
      for (const run of scenario.runs) {
        if (run.error) {
          lines.push(`| ${run.run} | ⚠️ error | ⚠️ |`);
        } else {
          lines.push(`| ${run.run} | ${formatScore(run.score)}/10 | ${run.passed ? '✅' : '❌'} |`);
        }
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
