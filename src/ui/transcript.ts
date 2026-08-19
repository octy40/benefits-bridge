/**
 * What the Resident sees of the conversation. Separate from what the model
 * sees: `agent-loop.ts` owns the messages, this owns the bubbles.
 */
export type Bubble = { id: number; speaker: "resident" | "benefitbridge"; text: string };

/**
 * Everything up to, but not including, the run of bubbles BenefitBridge last
 * spoke — what the language toggle replaces with a re-narration.
 *
 * The whole run, not the last bubble. One reply can occupy more than one bubble
 * (the model speaks before calling the tool and again after seeing the result),
 * and dropping only the last would strand the first half in the language the
 * Resident just left. `languageSwitchInstruction` asks for the same span back:
 * everything said since the Resident's last message.
 */
export function withoutTrailingNarration(bubbles: Bubble[]): Bubble[] {
  let end = bubbles.length;
  while (end > 0 && bubbles[end - 1].speaker === "benefitbridge") end--;
  return bubbles.slice(0, end);
}
