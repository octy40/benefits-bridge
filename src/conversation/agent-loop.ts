import { screen } from "@/rules/screen";
import { emptyHouseholdProfile, type HouseholdProfile, type ScreeningResult } from "@/rules/types";
import { collectAssistantTurn, type AssistantContentBlock } from "./anthropic-stream";
import { buildEligibilityMapToolResult } from "./eligibility-map-tool-result";
import { mergeFacts, recordHouseholdFactsTool, type RecordedFacts } from "./facts-tool";
import { SYSTEM_PROMPT } from "./system-prompt";

/**
 * The agent loop, running on the Resident's device.
 *
 * The browser holds the conversation, executes every tool call, and runs the
 * rules module locally. The Household profile and the eligibility map exist
 * only here — they are never assembled on the server (ADR-0008).
 *
 * A page refresh loses all of it. That is ADR-0005 working as intended.
 */

/** Thinking stays on; latency is bought back with the effort level, never by turning it off (ADR-0006). */
const MODEL = "claude-opus-5";
const EFFORT = "low";
const MAX_TOKENS = 8192;

/** A conversation that is still calling tools after this many rounds has gone wrong. */
const MAX_TOOL_ROUNDS = 8;

type ApiMessage =
  | { role: "user"; content: string | ToolResultBlock[] }
  | { role: "assistant"; content: AssistantContentBlock[] };

type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type ConversationState = {
  messages: ApiMessage[];
  profile: HouseholdProfile;
  /** The live eligibility map. Its `sequence` is the conversation's counter. */
  screening: ScreeningResult;
  /**
   * Whether a tool result has already offered the optional immigration status
   * question.
   *
   * The rules module reports that the question is *open*; only the conversation
   * can know it has already been *put*, exactly as it owns the `sequence`
   * counter that `screen` is handed rather than derives. Once this is set the
   * question is dropped from every later tool result, so "asked at most once"
   * holds even if the model never records an answer — which is the residual gap
   * `facts-tool.ts` names and this is the guard against (ADR-0004).
   */
  statusQuestionOffered: boolean;
};

export type TurnHandlers = {
  /**
   * A new assistant turn is starting. The model speaks once before calling the
   * tool and again after seeing the result, and those are two separate things
   * to say — without this the two runs of text arrive glued together.
   */
  onAssistantTurnStart: () => void;
  onAssistantText: (delta: string) => void;
  onScreening: (screening: ScreeningResult) => void;
};

export function newConversation(asOf: string): ConversationState {
  return {
    messages: [],
    profile: emptyHouseholdProfile(),
    screening: screen(emptyHouseholdProfile(), asOf, 0),
    statusQuestionOffered: false,
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Sends one Resident message and drives the loop until the model stops calling
 * tools. Returns the state to keep; the input state is left untouched.
 */
export async function sendResidentMessage(
  state: ConversationState,
  text: string,
  asOf: string,
  handlers: TurnHandlers,
  signal?: AbortSignal,
): Promise<ConversationState> {
  let next: ConversationState = {
    ...state,
    messages: [...state.messages, { role: "user", content: text }],
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    handlers.onAssistantTurnStart();

    const turn = await collectAssistantTurn(
      await callModel(next.messages, signal),
      handlers.onAssistantText,
    );

    next = { ...next, messages: [...next.messages, { role: "assistant", content: turn.content }] };

    const toolUses = turn.content.filter((block) => block.type === "tool_use");
    if (turn.stopReason !== "tool_use" || toolUses.length === 0) return next;

    const results: ToolResultBlock[] = [];

    for (const toolUse of toolUses) {
      if (toolUse.name !== recordHouseholdFactsTool.name) {
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Unknown tool: ${toolUse.name}`,
          is_error: true,
        });
        continue;
      }

      const previous = next.screening;
      const profile = mergeFacts(next.profile, toolUse.input as RecordedFacts);
      const screening = screen(profile, asOf, previous.sequence + 1);
      const alreadyOffered = next.statusQuestionOffered;

      next = {
        ...next,
        profile,
        screening,
        // Spent the moment a result carries it, not when an answer comes back.
        // A Resident who says nothing has still been asked, and asking again is
        // the thing ADR-0004 forbids.
        statusQuestionOffered: alreadyOffered || screening.statusQuestion !== undefined,
      };
      handlers.onScreening(screening);

      results.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(buildEligibilityMapToolResult(screening, previous, alreadyOffered)),
      });
    }

    next = { ...next, messages: [...next.messages, { role: "user", content: results }] };
  }

  return next;
}

async function callModel(messages: ApiMessage[], signal?: AbortSignal): Promise<Response> {
  // Because the loop is client-driven, the browser re-uploads the whole
  // conversation on every tool call. That taxes exactly the smartphone-only,
  // prepaid-data Resident this is for — a few kilobytes of text per turn, and
  // the one place the architecture charges the wrong person (ADR-0008).
  return fetch("/api/anthropic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT },
      system: SYSTEM_PROMPT,
      tools: [recordHouseholdFactsTool],
      messages,
    }),
  });
}
