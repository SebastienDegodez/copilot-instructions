import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(err: unknown, fallbackDelay: number): number {
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status: number }).status === 429 &&
    'headers' in err
  ) {
    const headers = (err as { headers: Record<string, string> }).headers;

    // Use retry-after header when present and positive
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds * 1000 + Math.random() * 1000;
      }
    }

    // Detect rate limit type from header to choose appropriate delay
    const limitType = headers['x-ratelimit-type'] || '';
    if (limitType.includes('Minute')) {
      // Per-minute rate limit (e.g., 10 req/60s) — wait 10-20s with jitter
      return 10_000 + Math.random() * 10_000;
    }

    // Concurrent request limit — shorter jitter
    return Math.max(fallbackDelay, 2000 + Math.random() * 3000);
  }
  return fallbackDelay;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 5,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    factor = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      const retryDelay = getRetryDelay(err, delay);
      logger.warn({ err, attempt, nextDelayMs: retryDelay }, 'Retrying after error');
      await sleep(retryDelay);
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }

  throw lastError;
}
