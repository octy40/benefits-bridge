import { afterEach, describe, expect, it, vi } from "vitest";
import { newConversation, sendResidentMessage, switchLanguage } from "./agent-loop";

const ASOF = "2026-08-15";

/**
 * The seam under test is `agent-loop`'s own: a Resident message in, a
 * conversation state out. The model is the one thing stubbed, because it is the
 * boundary the loop exists to cross — everything else, the rules module
 * included, runs for real.
 */
function stubModel(replies: string[]): { body: any }[] {
  const calls: { body: any }[] = [];
  let next = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push({ body: JSON.parse(init.body as string) });
      return sseResponse(replies[next++] ?? "");
    }),
  );

  return calls;
}

function sseResponse(text: string): Response {
  const events = [
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" } },
  ];

  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""));
}

/** Records what the screen would have been told to do, in order. */
function recorder() {
  const events: string[] = [];
  return {
    events,
    handlers: {
      onAssistantTurnStart: () => events.push("turn-start"),
      onAssistantText: (delta: string) => events.push(`text:${delta}`),
      onScreening: () => events.push("screening"),
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("switchLanguage", () => {
  it("re-narrates the last thing BenefitBridge said without rewriting what came before", async () => {
    stubModel(["Hi — who lives with you?", "Hola — ¿quiénes viven con usted?"]);

    let state = newConversation(ASOF);
    state = await sendResidentMessage(state, "just me", ASOF, recorder().handlers);
    const asItWasSaid = structuredClone(state.messages);

    const screen = recorder();
    state = await switchLanguage(state, "es", ASOF, screen.handlers);

    expect(state.language).toBe("es");
    // Every turn already in the conversation is byte-for-byte what it was. The
    // switch appends; it never edits a turn that has been said.
    expect(state.messages.slice(0, asItWasSaid.length)).toEqual(asItWasSaid);
    expect(screen.events).toEqual(["turn-start", "text:Hola — ¿quiénes viven con usted?"]);
  });

  it("asks the model nothing when BenefitBridge has not said anything yet", async () => {
    const calls = stubModel([]);

    const state = await switchLanguage(newConversation(ASOF), "es", ASOF, recorder().handlers);

    // The opener and the eligibility map are interface chrome and have already
    // flipped from the translation table. There is nothing said to re-narrate.
    expect(calls).toEqual([]);
    expect(state.language).toBe("es");
  });

  it("does nothing at all when the Resident is already being spoken to in that language", async () => {
    const calls = stubModel(["Hi — who lives with you?"]);
    const state = await sendResidentMessage(
      newConversation(ASOF),
      "just me",
      ASOF,
      recorder().handlers,
    );

    expect(await switchLanguage(state, "en", ASOF, recorder().handlers)).toBe(state);
    expect(calls).toHaveLength(1);
  });

  it("keeps every later turn in the selected language", async () => {
    const calls = stubModel([
      "Hi — who lives with you?",
      "Hola — ¿quiénes viven con usted?",
      "Gracias. ¿Cuánto paga de alquiler?",
    ]);

    let state = newConversation(ASOF);
    state = await sendResidentMessage(state, "just me", ASOF, recorder().handlers);
    expect(calls[0].body.system).toContain("Speak English");

    state = await switchLanguage(state, "es", ASOF, recorder().handlers);
    state = await sendResidentMessage(state, "vivo solo", ASOF, recorder().handlers);

    // Carried by the system prompt rather than by the model remembering the
    // instruction it was given a turn ago.
    expect(calls[2].body.system).toContain("Speak Spanish");
    expect(calls[2].body.system).not.toContain("Speak English");
  });
});
