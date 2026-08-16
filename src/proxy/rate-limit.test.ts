import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

function fixedClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("lets a client through up to the limit", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: fixedClock().now });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("refuses the request past the limit, saying how long until the window resets", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: clock.now });

    limiter.check("a");
    clock.advance(15_000);
    limiter.check("a");

    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it("reports at least one second to retry, so a client is never told to retry immediately", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("a");
    clock.advance(59_900);

    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("opens a fresh window once the old one has passed", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);

    clock.advance(60_000);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("counts each client separately, so one abuser does not lock out a Resident", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: fixedClock().now });

    limiter.check("abuser");
    limiter.check("abuser");

    expect(limiter.check("resident").allowed).toBe(true);
  });

  it("forgets clients whose window has passed, so memory does not grow without bound", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: clock.now,
      sweepAbove: 1,
    });

    limiter.check("a");
    limiter.check("b");
    clock.advance(60_000);
    limiter.check("c");

    expect(limiter.trackedClients()).toBe(1);
  });
});

describe("clientKey", () => {
  it("derives a key from the address Vercel puts in x-forwarded-for", () => {
    const key = clientKey(new Headers({ "x-forwarded-for": "203.0.113.7" }));

    expect(key).toBe(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7" })));
    expect(key).not.toBe(clientKey(new Headers({ "x-forwarded-for": "203.0.113.8" })));
  });

  it("takes the leftmost address when the header carries a chain", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 198.51.100.1" }))).toBe(
      clientKey(new Headers({ "x-forwarded-for": "203.0.113.7" })),
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe(
      clientKey(new Headers({ "x-forwarded-for": "203.0.113.7" })),
    );
  });

  it("never contains the address itself, so no request holds an IP in memory", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7" }))).not.toContain("203.0.113.7");
  });

  it("puts every request with no address in one bucket rather than letting them all through", () => {
    expect(clientKey(new Headers())).toBe(clientKey(new Headers({ "x-forwarded-for": "  " })));
  });
});
