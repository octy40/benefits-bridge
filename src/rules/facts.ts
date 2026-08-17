import type { BlockingFact, FactId, ProgramId } from "./types";

/**
 * Elicitation's running order.
 *
 * The primary ordering is information gain — ask first whatever unblocks the
 * most Programs (ADR-0002). This list only breaks ties, which matters more
 * than it sounds: early in a conversation almost every fact blocks the same
 * one Program, so on an empty Household profile the tie-break *is* the order.
 *
 * It runs people, then whether they eat together, then where their money comes
 * from, then the details of that money — the order a caseworker asks in, and
 * an order in which every question makes sense given the answers before it.
 * Asking a Resident how many hours a week they work before knowing they exist
 * is how a conversation reads as a form.
 *
 * Written as a total map rather than a list so that adding a `FactId` without
 * deciding where it belongs in the conversation is a compile error.
 */
const ASK_ORDER: Record<FactId, number> = {
  "household-members": 0,
  "food-sharing": 1,
  "income-sources": 2,
  "work-hours": 3,
};

/**
 * Ranks the facts the Programs reported themselves blocked on, most Programs
 * blocked first.
 *
 * This is the whole of Elicitation's agenda. The conversation gets a list and
 * a reason for its order, and chooses only phrasing (ADR-0001, ADR-0002) —
 * which is why a Program landing later starts pulling on the conversation with
 * no prompt change.
 */
export function rankBlockingFacts(blocked: { programId: ProgramId; blockedBy: FactId[] }[]): BlockingFact[] {
  const blocks = new Map<FactId, ProgramId[]>();

  for (const { programId, blockedBy } of blocked) {
    for (const factId of blockedBy) {
      const programs = blocks.get(factId) ?? [];
      if (!programs.includes(programId)) programs.push(programId);
      blocks.set(factId, programs);
    }
  }

  return [...blocks.entries()]
    .map(([factId, programs]) => ({ factId, blocks: programs }))
    .sort((a, b) => b.blocks.length - a.blocks.length || ASK_ORDER[a.factId] - ASK_ORDER[b.factId]);
}
