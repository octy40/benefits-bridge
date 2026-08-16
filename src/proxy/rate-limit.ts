import { createHash, randomBytes } from "node:crypto";

/**
 * Friction in front of an unauthenticated route. The hard spend cap on the API
 * key is what actually bounds the bill; this only stops a script draining it in
 * a minute, and is a per-instance in-memory counter rather than a shared store
 * for the reason ADR-0012 gives.
 */

/**
 * Loose on purpose. Residents share addresses — a library, a shelter, a
 * community centre behind one NAT — and one Resident message costs two or three
 * upstream requests typically and up to eight in the worst case (ADR-0008). At
 * 120 a minute a room of five Residents can each send a message every ten
 * seconds before anyone is turned away. See ADR-0012 for why erring loose is
 * the right side to err on.
 */
export const PROXY_REQUESTS_PER_WINDOW = 120;
export const PROXY_WINDOW_MS = 60_000;

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  check(key: string): RateLimitDecision;
  /** How many callers are currently counted. Bounded by traffic in two windows. */
  trackedCallers(): number;
};

type Window = { count: number; startedAt: number };

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs, now = Date.now } = options;
  const windows = new Map<string, Window>();
  let lastSweptAt = now();

  return {
    check(key) {
      const at = now();

      // Swept on a cadence rather than when the table gets big, so an entry's
      // life is bounded by time — two windows at worst — instead of by how much
      // other traffic happens to arrive. ADR-0012 rests on that bound.
      if (at - lastSweptAt >= windowMs) {
        sweepExpired(windows, at, windowMs);
        lastSweptAt = at;
      }

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

    trackedCallers() {
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
 * Identifies the caller a request came from, without the address itself ever
 * being what gets stored.
 *
 * Vercel overwrites `x-forwarded-for` at the edge and does not forward what the
 * caller sent, so the value here is the real peer address and not something a
 * caller can set to dodge the limit.
 */
export function callerKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || headers.get("x-real-ip")?.trim() || "";

  // Requests we cannot place — local development, a proxy that stripped the
  // header — share one bucket. Letting them all through would be the hole.
  return createHash("sha256").update(SALT).update(address || "unattributed").digest("base64url");
}
