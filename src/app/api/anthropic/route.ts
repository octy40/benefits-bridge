/**
 * The whole server.
 *
 * Its entire job is to attach the API key from a server-side environment
 * variable and forward the request to Anthropic, streaming the reply back. It
 * has no loop and no session (ADR-0008).
 *
 * It writes no log line, no row, and no analytics event. The conversation
 * transits unretained — that phrasing is deliberate: what crosses the network
 * is in transit through here and on to Anthropic under Anthropic's terms, and
 * nothing is assembled or kept on our side (ADR-0005).
 *
 * The one thing it does hold between requests is a rate-limit counter, keyed by
 * a salted hash of the caller's address and forgotten a minute later. Nothing of
 * the conversation is in it (ADR-0012).
 *
 * There is no authentication here, by design: "no app, no account" cannot have a
 * login in front of it. What keeps an open route from becoming someone else's
 * bill is the hard spend cap on the API key, with the rate limit as friction.
 */

import {
  clientKey,
  createRateLimiter,
  PROXY_REQUESTS_PER_WINDOW,
  PROXY_WINDOW_MS,
} from "@/proxy/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

const rateLimiter = createRateLimiter({
  limit: PROXY_REQUESTS_PER_WINDOW,
  windowMs: PROXY_WINDOW_MS,
});

export async function POST(request: Request): Promise<Response> {
  // Checked before anything else, so a flood costs as little as possible.
  const decision = rateLimiter.check(clientKey(request.headers));

  if (!decision.allowed) {
    return Response.json(
      { error: "Too many requests. Give it a moment and try again." },
      {
        status: 429,
        headers: {
          "retry-after": String(decision.retryAfterSeconds),
          "cache-control": "no-store",
        },
      },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    // Forwarded as bytes. The request body is never parsed, inspected, or held
    // here — there is nothing to keep even if someone later wanted to.
    body: request.body,
    // @ts-expect-error -- duplex is required by undici for a streamed request body.
    duplex: "half",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
