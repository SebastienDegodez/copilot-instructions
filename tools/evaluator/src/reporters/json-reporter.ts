import type { EvaluationResult } from '../core/types.js';

export function formatAsJSON(result: EvaluationResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatMultipleAsJSON(results: EvaluationResult[]): string {
  return JSON.stringify(results, null, 2);
}
