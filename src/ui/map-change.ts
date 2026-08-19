import type { ProgramId, ProgramResult, ScreeningResult } from "@/rules/types";

/**
 * What changed between two eligibility maps.
 *
 * A pure function of two `ScreeningResult`s and of nothing else, which is the
 * whole reason it exists as its own module. The demo's central beat is a
 * Resident mentioning that her mother moved in and two entries on the panel
 * moving at once — one Program appearing, another Program's figure changing
 * (ADR-0007). Nothing narrates that, and nothing may: the model is not asked
 * what changed, and there is no path by which it could say. The panel is handed
 * two results and works it out (ADR-0001, ADR-0013).
 *
 * `src/conversation/eligibility-map-tool-result.ts` computes a change of its
 * own for the model, from the same two results. The two are deliberately
 * separate rather than shared. That one exists so the model does not have to
 * diff two JSON blobs in its head and get it wrong; this one exists so a
 * Resident can see which line moved. They answer to different audiences and
 * will drift — the model's carries formatted money and a removals list it must
 * not quote from; this one carries only what a line on screen needs.
 */
export type EntryChange = "added" | "figure-changed";

/**
 * Keyed by Program id, holding only the entries that actually moved. An entry
 * absent from the map is unchanged, which is the common case and the one that
 * should cost nothing to render.
 *
 * Entries the household is likely ineligible for are treated as *not on the
 * map*, because that is how the panel renders them — so a Program crossing from
 * ineligible to eligible reads as "added", which is what a Resident watching
 * the panel sees happen.
 */
export function mapChanges(
  current: ScreeningResult,
  previous: ScreeningResult | undefined,
): Map<ProgramId, EntryChange> {
  const changes = new Map<ProgramId, EntryChange>();

  // Nothing to compare against: the very first paint of a panel. Everything on
  // it is as old as everything else, so nothing is marked. A conversation opens
  // on an empty map at sequence 0, so the first Program to arrive still marks
  // itself as added against that — it is only a panel mounted mid-conversation,
  // with no history behind it, that starts quiet.
  if (previous === undefined) return changes;

  const before = shownEntries(previous);

  for (const [programId, entry] of shownEntries(current)) {
    const was = before.get(programId);

    if (was === undefined) {
      changes.set(programId, "added");
      continue;
    }

    // A figure arriving on an entry that was already on the map in tier 2 is a
    // change to that entry, not a new entry: the Program did not appear, its
    // number did. Both land here, and the badge says so.
    if (was.figures?.annual !== entry.figures?.annual) changes.set(programId, "figure-changed");
  }

  return changes;
}

function shownEntries(result: ScreeningResult): Map<ProgramId, ProgramResult> {
  return new Map(
    [...result.programs, ...result.keychain]
      .filter((entry) => entry.outcome !== "likely-ineligible")
      .map((entry) => [entry.programId, entry]),
  );
}
