import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { PROXY_REQUESTS_PER_WINDOW } from "@/proxy/rate-limit";

/**
 * The route holds one rate limiter for the life of the module, so each test
 * uses an address of its own rather than trying to reset shared state.
 */
function requestFrom(address: string): Request {
  return new Request("https://benefitbridge.test/api/anthropic", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": address },
    body: JSON.stringify({ model: "claude-opus-5", messages: [] }),
  });
}

let upstream: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
  upstream = vi.fn(async () => new Response("event: done\n\n", { status: 200 }));
  vi.stubGlobal("fetch", upstream);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the proxy route", () => {
  it("attaches the server-side key and forwards to Anthropic", async () => {
    const response = await POST(requestFrom("203.0.113.1"));

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();

    const [url, init] = upstream.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant-test-key");
  });

  it("never lets the key back out in the response", async () => {
    const response = await POST(requestFrom("203.0.113.2"));

    expect([...response.headers.keys()]).not.toContain("x-api-key");
    expect(await response.text()).not.toContain("sk-ant-test-key");
  });

  it("refuses a client past the limit without spending anything upstream", async () => {
    for (let i = 0; i < PROXY_REQUESTS_PER_WINDOW; i++) {
      expect((await POST(requestFrom("203.0.113.3"))).status).toBe(200);
    }

    const refused = await POST(requestFrom("203.0.113.3"));

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(upstream).toHaveBeenCalledTimes(PROXY_REQUESTS_PER_WINDOW);
  });

  it("limits each address on its own, so one flood does not shut out a Resident", async () => {
    for (let i = 0; i < PROXY_REQUESTS_PER_WINDOW + 1; i++) {
      await POST(requestFrom("203.0.113.4"));
    }

    expect((await POST(requestFrom("203.0.113.5"))).status).toBe(200);
  });

  it("says so plainly when the server has no key configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const response = await POST(requestFrom("203.0.113.6"));

    expect(response.status).toBe(500);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("tells caches to keep nothing, whatever the outcome (ADR-0005)", async () => {
    const ok = await POST(requestFrom("203.0.113.7"));
    for (let i = 0; i < PROXY_REQUESTS_PER_WINDOW; i++) await POST(requestFrom("203.0.113.8"));
    const refused = await POST(requestFrom("203.0.113.8"));

    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(refused.headers.get("cache-control")).toBe("no-store");
  });
});
