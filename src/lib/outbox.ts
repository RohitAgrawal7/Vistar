import { ApiError } from "@/lib/api/types";
import type { OutboxEntry } from "@/lib/types";

export const OUTBOX_BACKOFF_MS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;
export const OUTBOX_REQUEST_TIMEOUT_MS = 12_000;

export function outboxBackoffMs(attemptCount: number) {
  return OUTBOX_BACKOFF_MS[Math.min(Math.max(attemptCount, 0), OUTBOX_BACKOFF_MS.length - 1)];
}

export function isRetryableSubmitError(err: unknown) {
  if (!(err instanceof ApiError)) return true;
  const status = err.status ?? 0;
  if (status === 0 || status === 408 || status === 429) return true;
  return status >= 500;
}

export async function withTimeout<T>(promise: Promise<T>, ms = OUTBOX_REQUEST_TIMEOUT_MS): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new ApiError("Request timed out", 0));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

export function outboxDue(entry: OutboxEntry, now = Date.now()) {
  return !entry.failed && entry.nextAttemptAt <= now;
}
