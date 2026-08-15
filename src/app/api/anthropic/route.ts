/**
 * The whole server.
 *
 * Its entire job is to attach the API key from a server-side environment
 * variable and forward the request to Anthropic, streaming the reply back. It
 * has no loop, no session, and no state between requests (ADR-0008).
 *
 * It writes no log line, no row, and no analytics event. The conversation
 * transits unretained — that phrasing is deliberate: what crosses the network
 * is in transit through here and on to Anthropic under Anthropic's terms, and
 * nothing is assembled or kept on our side (ADR-0005).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

export async function POST(request: Request): Promise<Response> {
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
