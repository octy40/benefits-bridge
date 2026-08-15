/**
 * Reads an Anthropic server-sent event stream back into the content blocks the
 * next request has to echo. Scaffolding per ADR-0011.
 *
 * Thinking blocks are accumulated and replayed verbatim, signature included.
 * They arrive with empty text under the default `display`, but the API rejects
 * a turn whose thinking blocks were dropped or edited, so they are carried
 * through rather than filtered out.
 */

export type AssistantContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "redacted_thinking"; data: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

export type AssistantTurn = {
  content: AssistantContentBlock[];
  stopReason: string | null;
};

type StreamEvent = Record<string, any>;

export async function collectAssistantTurn(
  response: Response,
  onTextDelta: (delta: string) => void,
): Promise<AssistantTurn> {
  if (!response.ok || !response.body) {
    throw new Error(await describeFailure(response));
  }

  const content: AssistantContentBlock[] = [];
  const partialToolJson = new Map<number, string>();
  let stopReason: string | null = null;

  for await (const event of parseSseEvents(response.body)) {
    switch (event.type) {
      case "content_block_start": {
        content[event.index] = startBlock(event.content_block);
        if (event.content_block?.type === "tool_use") partialToolJson.set(event.index, "");
        break;
      }

      case "content_block_delta": {
        applyDelta(content[event.index], event.delta, partialToolJson, event.index, onTextDelta);
        break;
      }

      case "content_block_stop": {
        const json = partialToolJson.get(event.index);
        const block = content[event.index];
        if (json !== undefined && block?.type === "tool_use") {
          block.input = json.trim() === "" ? {} : JSON.parse(json);
        }
        break;
      }

      case "message_delta": {
        stopReason = event.delta?.stop_reason ?? stopReason;
        break;
      }

      case "error": {
        throw new Error(event.error?.message ?? "The conversation service returned an error.");
      }
    }
  }

  return { content: content.filter(Boolean), stopReason };
}

function startBlock(block: StreamEvent): AssistantContentBlock {
  switch (block?.type) {
    case "thinking":
      return { type: "thinking", thinking: block.thinking ?? "", signature: block.signature ?? "" };
    case "redacted_thinking":
      return { type: "redacted_thinking", data: block.data ?? "" };
    case "tool_use":
      return { type: "tool_use", id: block.id, name: block.name, input: {} };
    default:
      return { type: "text", text: block?.text ?? "" };
  }
}

function applyDelta(
  block: AssistantContentBlock | undefined,
  delta: StreamEvent,
  partialToolJson: Map<number, string>,
  index: number,
  onTextDelta: (delta: string) => void,
): void {
  if (!block) return;

  switch (delta?.type) {
    case "text_delta":
      if (block.type === "text") {
        block.text += delta.text;
        onTextDelta(delta.text);
      }
      break;
    case "thinking_delta":
      if (block.type === "thinking") block.thinking += delta.thinking;
      break;
    case "signature_delta":
      if (block.type === "thinking") block.signature += delta.signature;
      break;
    case "input_json_delta":
      partialToolJson.set(index, (partialToolJson.get(index) ?? "") + delta.partial_json);
      break;
  }
}

async function* parseSseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "" || payload === "[DONE]") continue;
        yield JSON.parse(payload) as StreamEvent;
      }
    }
  }
}

async function describeFailure(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message ?? parsed?.error ?? `Request failed (${response.status}).`;
  } catch {
    return body || `Request failed (${response.status}).`;
  }
}
