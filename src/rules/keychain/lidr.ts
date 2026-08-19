import { fplAnnual } from "../fpl";
import { monthlyTotal, needsWorkHours } from "../income";
import type { KeychainRule } from "../keychain-rule";
import { CEAP } from "../programs/ceap";
import type { FactId, HouseholdProfile, Money, ProgramId, ProgramResult } from "../types";

export const LIDR: ProgramId = "lidr";

/**
 * Programs whose participation auto-enrols a household in LIDR, without an
 * income test — `docs/ct-program-facts.md` §7: "Alternative qualification:
 * receiving SNAP, HUSKY, SSI/SSDI, Medicaid, Section 8, or CEAP."
 *
 * `CEAP` also has its own, separate route below (`appliedForCeap`) — this
 * list is for a household that already receives it; that one is for a
 * household screened `likely-eligible` for it in this very conversation, per
 * the FFY2027 LIHEAP plan's own auto-enrollment language.
 */
const CATEGORICALLY_ELIGIBLE_PROGRAMS: ProgramId[] = ["snap", "husky", "ssi", "medicaid", "section-8", CEAP];

/**
 * 60% State Median Income, FFY2027 season, annual — the same figures as
 * `programs/ceap.ts`'s FFY2027 row, kept as their own snapshot here rather
 * than imported from it. The two update on different schedules: CEAP's are
 * federal-fiscal-year-effective-dated, and as of this research
 * (`docs/ct-program-facts.md` §7, 2026-08-14) the utility has *already*
 * adopted the FFY2027 figures for its live income thresholds even though that
 * CEAP season has not opened — "the 5% [discount] tier is exactly 60% SMI
 * [FFY2027]" is a fact about Eversource's posted table today, not about which
 * `asOf` CEAP happens to be in force for.
 */
const SMI_60_FFY2027_ANNUAL_BY_HOUSEHOLD_SIZE: Money[] = [
  4_871_400, 6_370_300, 7_869_200, 9_368_100, 10_866_900, 12_365_800, 12_646_900, 12_927_900,
];

function smi60Ceiling(householdSize: number): Money {
  const tabulated = SMI_60_FFY2027_ANNUAL_BY_HOUSEHOLD_SIZE[householdSize - 1];
  if (tabulated !== undefined) return tabulated;

  // Source silence past the tabulated eight, same call CEAP's own SMI table
  // makes: hold at the largest tabulated ceiling rather than invent a ninth.
  return SMI_60_FFY2027_ANNUAL_BY_HOUSEHOLD_SIZE[SMI_60_FFY2027_ANNUAL_BY_HOUSEHOLD_SIZE.length - 1]!;
}

type LidrTier = 50 | 40 | 20 | 15 | 5;

/** Deepest discount first — the order a qualifying household's income is tested in. */
const TIERS: LidrTier[] = [50, 40, 20, 15, 5];

/**
 * Each tier's income ceiling, annual. Four of the five are plain multiples of
 * 100% FPL, confirmed against both published anchors (household of 1 and 4)
 * in `docs/ct-program-facts.md` §7:
 *  - 50% off: 100% FPL
 *  - 40% off: 125% FPL
 *  - 20% off: 160% FPL
 *  - 5% off: 60% SMI (FFY2027), tabulated above rather than derived
 *
 * The 15% tier is the exception. Its two published anchors — $33,676 at
 * household of 1, $69,630 at household of 4 — do not land on a round FPL
 * percentage BenefitBridge already has a table for. Both divide by the
 * household-of-1 anchor to 2.11 (exactly at household of 4, to the nearest
 * dollar at household of 1), so 211% FPL is used rather than inventing a
 * five-figure table from two data points.
 */
function ceilingForTier(tier: LidrTier, householdSize: number): Money {
  const fpl = fplAnnual(householdSize);

  switch (tier) {
    case 50:
      return fpl;
    case 40:
      return Math.round(fpl * 1.25);
    case 20:
      return Math.round(fpl * 1.6);
    case 15:
      return Math.round(fpl * 2.11);
    case 5:
      return smi60Ceiling(householdSize);
  }
}

function qualifyingTier(annualIncome: Money, householdSize: number): LidrTier | undefined {
  return TIERS.find((tier) => annualIncome <= ceilingForTier(tier, householdSize));
}

/**
 * LIDR reaches `likely-eligible` three ways: Program receipt
 * (`isCategoricallyEligible`), a CEAP outcome this very pass just produced
 * (`appliedForCeap` — the auto-enrollment the FFY2027 LIHEAP plan describes),
 * or its own income-tier test. The income route is not a fallback for a
 * household that fails the other two — it is the route that catches a
 * household neither Program-based test can see at all: `docs/ct-program-facts.md`
 * §7 names a household SNAP screens `likely-ineligible` that still clears
 * LIDR's own, wider ceiling. A lookup keyed off SNAP alone would miss it
 * (issue #21's fixture).
 *
 * Matching Payment Program is deliberately not modelled alongside LIDR here:
 * it needs hardship status and a 60-day past-due balance over $100, neither
 * of which the conversation elicits (`docs/ct-program-facts.md` §7).
 *
 * There is no dollar figure a percentage off an unknown electric bill could
 * be. `noFigureReason: "coverage-not-cash"` carries that, the same as HUSKY
 * will when it lands (`ui/EligibilityMapPanel.tsx`).
 */
export const screenLidr: KeychainRule = (profile, programs) => {
  if (profile.members.length === 0) {
    return { programId: LIDR, blockedBy: ["household-members", "income-sources"] };
  }

  const { members } = profile;
  const unit = members.map((member) => member.id);

  if (isCategoricallyEligible(profile) || appliedForCeap(programs)) {
    return { programId: LIDR, blockedBy: [], result: coverageResult(unit) };
  }

  const sources = members.flatMap((member) => member.incomeSources ?? []);
  const blockedBy: FactId[] = [];
  if (members.some((member) => member.incomeSources === undefined)) blockedBy.push("income-sources");
  if (needsWorkHours(sources)) blockedBy.push("work-hours");
  if (blockedBy.length > 0) return { programId: LIDR, blockedBy };

  const annualIncome = (monthlyTotal(sources) ?? 0) * 12;
  if (qualifyingTier(annualIncome, members.length) === undefined) {
    return {
      programId: LIDR,
      blockedBy: [],
      result: { programId: LIDR, outcome: "likely-ineligible", unit, blockedBy: [] },
    };
  }

  return { programId: LIDR, blockedBy: [], result: coverageResult(unit) };
};

function coverageResult(unit: string[]): ProgramResult {
  return { programId: LIDR, outcome: "likely-eligible", unit, noFigureReason: "coverage-not-cash", blockedBy: [] };
}

function isCategoricallyEligible(profile: HouseholdProfile): boolean {
  return (
    profile.programsAlreadyReceived?.some((program) => CATEGORICALLY_ELIGIBLE_PROGRAMS.includes(program)) ?? false
  );
}

function appliedForCeap(programs: ProgramResult[]): boolean {
  return programs.some((program) => program.programId === CEAP && program.outcome === "likely-eligible");
}
