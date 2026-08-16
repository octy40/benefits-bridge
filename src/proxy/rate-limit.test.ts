import { describe, expect, it } from "vitest";
import { callerKey, createRateLimiter } from "./rate-limit";

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
  it("lets a caller through up to the limit", () => {
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

  it("reports at least one second to retry, so a caller is never told to retry immediately", () => {
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

  it("counts each caller separately, so one abuser does not lock out a Resident", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: fixedClock().now });

    limiter.check("abuser");
    limiter.check("abuser");

    expect(limiter.check("resident").allowed).toBe(true);
  });

  it("is a fixed window, so a burst across the boundary beats the nominal rate", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });

    limiter.check("a"); // opens the window; two of the three left

    clock.advance(59_000);
    const lateInTheWindow = [limiter.check("a"), limiter.check("a"), limiter.check("a")];

    clock.advance(1_000); // the window rolls, and the budget is whole again
    const earlyInTheNext = [limiter.check("a"), limiter.check("a"), limiter.check("a")];

    const allowedInThatOneSecond =
      lateInTheWindow.filter((d) => d.allowed).length +
      earlyInTheNext.filter((d) => d.allowed).length;

    // Five through in a single second, against a nominal three a minute. The
    // spend cap is what bounds this, not the limiter (ADR-0012).
    expect(allowedInThatOneSecond).toBe(5);
  });

  it("forgets a caller within two windows, whatever else the traffic is doing", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, now: clock.now });

    limiter.check("a");
    limiter.check("b");
    expect(limiter.trackedCallers()).toBe(2);

    // No size threshold to cross — only time passing, and one later request.
    clock.advance(120_000);
    limiter.check("c");

    expect(limiter.trackedCallers()).toBe(1);
  });
});

describe("callerKey", () => {
  it("derives a key from the address Vercel puts in x-forwarded-for", () => {
    const key = callerKey(new Headers({ "x-forwarded-for": "203.0.113.7" }));

    expect(key).toBe(callerKey(new Headers({ "x-forwarded-for": "203.0.113.7" })));
    expect(key).not.toBe(callerKey(new Headers({ "x-forwarded-for": "203.0.113.8" })));
  });

  it("takes the leftmost address when the header carries a chain", () => {
    expect(callerKey(new Headers({ "x-forwarded-for": "203.0.113.7, 198.51.100.1" }))).toBe(
      callerKey(new Headers({ "x-forwarded-for": "203.0.113.7" })),
    );
  });

  it("falls back to x-real-ip", () => {
    expect(callerKey(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe(
      callerKey(new Headers({ "x-forwarded-for": "203.0.113.7" })),
    );
  });

  it("never contains the address itself, so no request holds an IP in memory", () => {
    expect(callerKey(new Headers({ "x-forwarded-for": "203.0.113.7" }))).not.toContain("203.0.113.7");
  });

  it("puts every request with no address in one bucket rather than letting them all through", () => {
    expect(callerKey(new Headers())).toBe(callerKey(new Headers({ "x-forwarded-for": "  " })));
  });
});
