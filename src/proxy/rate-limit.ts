import { createHash, randomBytes } from "node:crypto";

/**
 * The only thing standing between an unauthenticated proxy route and someone
 * else's Anthropic bill.
 *
 * There is no login in front of the route and there never will be — "no app, no
 * account" cannot have one. So the route's protection is a hard spend cap on the
 * API key, which is the actual guarantee, and this, which is friction: enough to
 * stop a script from draining the cap in a minute, not enough to call security.
 *
 * It is deliberately a per-instance in-memory counter rather than a shared store.
 * A shared store would mean a database holding IP addresses, which is the thing
 * ADR-0005 says this product does not have. The cost is that the limit is per
 * running instance and resets on a cold start — see ADR-0012.
 */

/**
 * One Resident message can cost up to eight upstream requests, because the agent
 * loop runs a round per tool call (ADR-0008). Sixty a minute is therefore loose
 * on purpose: the Residents this is for share addresses — a library, a shelter,
 * a community centre behind one NAT — and a limit tight enough to be meaningful
 * against a script would lock out the room.
 */
export const PROXY_REQUESTS_PER_WINDOW = 60;
export const PROXY_WINDOW_MS = 60_000;

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  check(key: string): RateLimitDecision;
  /** How many clients are currently being counted. Bounded by traffic in one window. */
  trackedClients(): number;
};

type Window = { count: number; startedAt: number };

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
  /** Expired entries are swept once the table grows past this. */
  sweepAbove?: number;
}): RateLimiter {
  const { limit, windowMs, now = Date.now, sweepAbove = 1000 } = options;
  const windows = new Map<string, Window>();

  return {
    check(key) {
      const at = now();
      if (windows.size > sweepAbove) sweepExpired(windows, at, windowMs);

      const window = windows.get(key);

      if (!window || at - window.startedAt >= windowMs) {
        windows.set(key, { count: 1, startedAt: at });
        return { allowed: true };
      }

      if (window.count >= limit) {
        const msLeft = window.startedAt + windowMs - at;
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(msLeft / 1000)) };
      }

      window.count += 1;
      return { allowed: true };
    },

    trackedClients() {
      return windows.size;
    },
  };
}

function sweepExpired(windows: Map<string, Window>, at: number, windowMs: number): void {
  for (const [key, window] of windows) {
    if (at - window.startedAt >= windowMs) windows.delete(key);
  }
}

/**
 * A per-process salt. It makes the counter keys useless to anyone who gets hold
 * of them — they cannot be walked back to an address, because the salt dies with
 * the instance, and an IPv4 space small enough to brute-force is exactly why an
 * unsalted hash would not be worth writing.
 */
const SALT = randomBytes(16);

/**
 * Identifies the client a request came from, without the address itself ever
 * being what gets stored.
 *
 * Vercel overwrites `x-forwarded-for` at the edge and does not forward what the
 * client sent, so the value here is the real peer address and not something a
 * caller can set to dodge the limit.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || headers.get("x-real-ip")?.trim() || "";

  // Requests we cannot place — local development, a proxy that stripped the
  // header — share one bucket. Letting them all through would be the hole.
  return createHash("sha256").update(SALT).update(address || "unattributed").digest("base64url");
}
