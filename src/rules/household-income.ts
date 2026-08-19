import { needsWorkHours } from "./income";
import type { FactId, Member } from "./types";

/**
 * Shared by HUSKY A/D and Care 4 Kids, both of which — like CEAP — test the
 * whole household's income rather than a Program-specific unit (ADR-0003;
 * `programs/husky.ts` names the tension that creates for HUSKY specifically).
 * SNAP's and CEAP's own inline versions of this shape predate this module and
 * were left as they are: extracting three call sites into one was judged
 * worth doing, rewiring two already-shipped Programs for the same shape was
 * not, for this ticket.
 */

/** Every source of every member in the household. */
export function countedSources(members: Member[]) {
  return members.flatMap((member) => member.incomeSources ?? []);
}

/** Which facts a whole-household income test is still missing, if any. */
export function householdIncomeBlockers(members: Member[]): FactId[] {
  const blockedBy: FactId[] = [];
  if (members.some((member) => member.incomeSources === undefined)) blockedBy.push("income-sources");
  if (needsWorkHours(countedSources(members))) blockedBy.push("work-hours");
  return blockedBy;
}
