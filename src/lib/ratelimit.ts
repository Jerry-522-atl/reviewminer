/**
 * In-memory rate limiter. Resets on cold start (acceptable for
 * a low-volume SaaS; migrate to Redis if scale demands it).
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 300_000).unref();

/**
 * Returns `true` if the request should be allowed, `false` if rate-limited.
 *
 * @param key      e.g. `login:${ip}` or `analysis:${userId}`
 * @param maxReqs  max requests allowed in the window
 * @param windowMs window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxReqs: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxReqs - 1 };
  }

  entry.count++;
  if (entry.count > maxReqs) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxReqs - entry.count };
}
