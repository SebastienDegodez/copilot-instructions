import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

/** Threshold above which a rate-limit is considered a long-term (e.g. daily) quota. */
const LONG_TERM_QUOTA_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns true when the error is a rate-limit that cannot be resolved by
 * retrying within a reasonable CI window (e.g. a per-day quota).
 * We detect two signals:
 *   1. retry-after header > 1 hour
 *   2. error message contains a known long-term quota keyword
 */
function isNonRetryableRateLimit(err: unknown): boolean {
  if (
    typeof err !== 'object' ||
    err === null ||
    !('status' in err) ||
    (err as { status: number }).status !== 429
  ) {
    return false;
  }

  // Signal 1: retry-after header exceeds CI threshold
  if ('headers' in err) {
    const headers = (err as { headers: Record<string, string> }).headers;
    const retryAfter = headers?.['retry-after'];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds) && seconds * 1000 > LONG_TERM_QUOTA_THRESHOLD_MS) {
        return true;
      }
    }
  }

  // Signal 2: message contains daily/hourly quota keywords
  if ('message' in err) {
    const message = String((err as { message: string }).message);
    if (/ByDay|ByHour|86400|per day/i.test(message)) {
      return true;
    }
  }

  return false;
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

    // Use retry-after header when present and positive (and within CI window)
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

/**
 * Returns true when the error is a provider-level configuration error
 * (e.g. model not available, SDK absent) that cannot be resolved by retrying.
 */
function isNonRetryableProviderError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /provider_unavailable|provider_unsupported_operation/.test(err.message);
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

      // Daily / hourly quotas cannot be resolved by retrying in CI — fail fast
      if (isNonRetryableRateLimit(err)) {
        logger.error({ err }, 'Long-term rate limit exceeded — not retrying (quota is per-day or per-hour)');
        throw err;
      }

      // Provider configuration errors (model not available, SDK absent) — fail fast
      if (isNonRetryableProviderError(err)) {
        logger.error({ err }, 'Non-retryable provider error — stopping immediately');
        throw err;
      }

      if (attempt === maxAttempts) break;
      const retryDelay = getRetryDelay(err, delay);
      logger.warn({ err, attempt, nextDelayMs: retryDelay }, 'Retrying after error');
      await sleep(retryDelay);
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }

  throw lastError;
}
