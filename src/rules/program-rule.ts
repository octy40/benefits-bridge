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
};

export type ProgramRule = (profile: HouseholdProfile, asOf: IsoDate) => ProgramScreening;
