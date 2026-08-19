import { fplAnnual } from "../fpl";
import { monthlyTotal, needsWorkHours } from "../income";
import type { KeychainRule } from "../keychain-rule";
import type { FactId, HouseholdProfile, Money, ProgramId, ProgramResult } from "../types";

export const LIFELINE: ProgramId = "lifeline";

/**
 * Programs whose participation makes a household categorically eligible for
 * Lifeline, without an income test — the exact list, sourced to
 * `docs/ct-program-facts.md` §7: "participation in Medicaid, SNAP, SSI,
 * Federal Public Housing Assistance, or Veterans Pension".
 */
const CATEGORICALLY_ELIGIBLE_PROGRAMS: ProgramId[] = [
  "snap",
  "medicaid",
  "ssi",
  "federal-public-housing-assistance",
  "veterans-pension",
];

/** $9.25/month off phone, internet, or bundled service — the standard (non-Tribal) FCC/USAC support level, `docs/ct-program-facts.md` §7. */
const MONTHLY_SUPPORT: Money = 925;
const BASIS = "FCC/USAC Lifeline monthly support (2026 guidelines)";

/**
 * Lifeline reaches `likely-eligible` two ways, the same shape CEAP's
 * categorical eligibility takes: Program receipt first, income only if that
 * comes back empty. Unlike CEAP, Lifeline's income route is real for this
 * ticket — 135% FPL, `docs/ct-program-facts.md` §7 — so a household that
 * clears neither route is screened `likely-ineligible` rather than simply
 * left off the map, the same way SNAP is once its own test is run.
 */
export const screenLifeline: KeychainRule = (profile) => {
  if (profile.members.length === 0) {
    return { programId: LIFELINE, blockedBy: ["household-members", "income-sources"] };
  }

  const { members } = profile;
  const unit = members.map((member) => member.id);

  if (isCategoricallyEligible(profile)) {
    return { programId: LIFELINE, blockedBy: [], result: eligibleResult(unit) };
  }

  const sources = members.flatMap((member) => member.incomeSources ?? []);
  const blockedBy: FactId[] = [];
  if (members.some((member) => member.incomeSources === undefined)) blockedBy.push("income-sources");
  if (needsWorkHours(sources)) blockedBy.push("work-hours");
  if (blockedBy.length > 0) return { programId: LIFELINE, blockedBy };

  const annualIncome = (monthlyTotal(sources) ?? 0) * 12;
  if (annualIncome > Math.round(fplAnnual(members.length) * 1.35)) {
    return {
      programId: LIFELINE,
      blockedBy: [],
      result: { programId: LIFELINE, outcome: "likely-ineligible", unit, blockedBy: [] },
    };
  }

  return { programId: LIFELINE, blockedBy: [], result: eligibleResult(unit) };
};

/**
 * The one Keychain entry with a defensible dollar figure: $9.25 a month is a
 * flat FCC support level, not something a Program's own table has to price
 * against rent or utilities, so it needs no fact this module has not already
 * checked for.
 */
function eligibleResult(unit: string[]): ProgramResult {
  return {
    programId: LIFELINE,
    outcome: "likely-eligible",
    unit,
    figures: { monthly: MONTHLY_SUPPORT, annual: MONTHLY_SUPPORT * 12, basis: BASIS },
    blockedBy: [],
  };
}

function isCategoricallyEligible(profile: HouseholdProfile): boolean {
  return (
    profile.programsAlreadyReceived?.some((program) => CATEGORICALLY_ELIGIBLE_PROGRAMS.includes(program)) ?? false
  );
}
