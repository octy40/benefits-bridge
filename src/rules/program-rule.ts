import type { FactId, HouseholdProfile, IsoDate, ProgramId, ProgramResult } from "./types";

/**
 * What one Program's rules hand back to `screen`.
 *
 * A Program reports two things, and they are independent. `result` is its place
 * on the eligibility map; `blockedBy` is what it still needs from the
 * conversation. A Program can have both — scored, but with a figure waiting on
 * a fact — and it can have neither, when it is fully scored or when no
 * published figures cover `asOf`.
 *
 * A Program with no `result` is *absent* from the eligibility map rather than
 * present with a guess. There is no outcome meaning "not screened yet":
 * `indeterminate` is reserved for the immigration-status case, which is a fact
 * BenefitBridge deliberately never requires, not one Elicitation will go and
 * get (CONTEXT.md, *Indeterminate*; ADR-0004).
 */
export type ProgramScreening = {
  programId: ProgramId;
  result?: ProgramResult;
  blockedBy: FactId[];
  /**
   * This Program's rules turn on immigration status, the household has not been
   * asked, and the answer is the only thing left between here and a scored
   * entry.
   *
   * Deliberately not a `FactId`. A Blocking fact is something Elicitation goes
   * and gets until it has it; this is the one thing BenefitBridge may ask for
   * once and must never chase (CONTEXT.md, *Blocking fact*; ADR-0004). Put on
   * the ranked list it would be re-asked every turn, because a declined status
   * never arrives and so never leaves the list.
   *
   * Set by `statusDependent` in `immigration-status.ts` rather than by each
   * Program, so the short-circuit is written once: a Program that forgot it
   * would look like a correct score.
   */
  awaitingStatus?: boolean;
};

export type ProgramRule = (profile: HouseholdProfile, asOf: IsoDate) => ProgramScreening;
