import { inForceOn, type EffectiveDated } from "../effective-dated";
import { countedSources, householdIncomeBlockers } from "../household-income";
import { monthlyTotal } from "../income";
import { statusDependent } from "../immigration-status";
import type { ProgramRule } from "../program-rule";
import type { Member, MemberId, Money, ProgramId } from "../types";

export const HUSKY_A: ProgramId = "husky-a";
export const HUSKY_D: ProgramId = "husky-d";

/**
 * ADR-0003 names HUSKY's Program unit by example: "HUSKY uses the tax
 * household." This module does not implement that — there is no tax-filer or
 * dependent-relationship concept anywhere in the Household profile (`Member`
 * carries only free-text `relationship`), and building one was judged out of
 * scope for this ticket. Every income test below runs against the whole
 * household instead, the same approximation `programs/ceap.ts` makes for its
 * own unit — but CEAP's unit and a tax household coincide far more often than
 * they diverge, while HUSKY's really can differ (an adult sibling who shares
 * a home but not a tax return, for one). Named here as a real, not-yet-closed
 * gap against ADR-0003's own example, rather than a silent substitution.
 */

type HuskyIncomeLimits = {
  /** How the table is named wherever a figure derived from it is quoted. */
  basis: string;
  /**
   * 138% FPL, monthly. Shared by HUSKY A parents/caretakers and HUSKY D —
   * `docs/ct-program-facts.md` §2: "HUSKY A parents and HUSKY D use the
   * identical 138% FPL threshold. The distinguishing fact is household
   * composition (dependent child in the home), not income." Index 0 = a
   * household of one.
   */
  adult138ByHouseholdSize: Money[];
  /**
   * The monthly increment for each household size past the eight CT DSS
   * tabulates, taken from the table's own last two entries (the size-8 minus
   * size-7 delta: $640.80 − $575.50 = $65.30) rather than scaled from the
   * 100%-FPL "+$473" figure in `docs/ct-program-facts.md` §0 — that figure is
   * the 100% increment, and this table is 138% of FPL, so scaling it would
   * need multiplying by 1.38, not reusing it as-is (a mistake this table's
   * own siblings below repeat the same fix for).
   */
  adult138EachAdditionalMember: Money;
  /** HUSKY A, children under 19: 201% FPL, monthly. */
  children201ByHouseholdSize: Money[];
  /** Same derivation as `adult138EachAdditionalMember`, from this table's own size-8/size-7 delta. */
  children201EachAdditionalMember: Money;
  /** HUSKY A/B, pregnancy: 263% FPL, monthly. */
  pregnancy263ByHouseholdSize: Money[];
  /** Same derivation as `adult138EachAdditionalMember`, from this table's own size-8/size-7 delta. */
  pregnancy263EachAdditionalMember: Money;
};

/**
 * CT DSS Program Standards Chart, columns marked eff. 3/1/2026 — built on the
 * 2026 HHS poverty guidelines (`docs/ct-program-facts.md` §2), and tabulated
 * directly from that chart rather than derived by multiplying a 100% FPL
 * table: DSS publishes these three columns pre-computed, so using them as
 * printed is more defensible than re-deriving and risking a rounding
 * mismatch (contrast `programs/ceap.ts`, which derives its band edges because
 * CEAP's own fact sheet does not tabulate them).
 *
 * **No confirmed end date.** Unlike SNAP's and CEAP's fiscal-year tables,
 * this repository has not sourced when CT DSS next republishes the Program
 * Standards Chart — historically an annual event tied to the HHS guidelines'
 * own January update, but not on a fixed statutory date the way SNAP's
 * October 1 is. Left open-ended is the accurate statement of what is known
 * rather than a guessed close date, but it carries the risk `effective-dated.ts`
 * warns about: revisit this table whenever CT DSS republishes the chart,
 * rather than trusting it to still be current.
 */
const HUSKY_INCOME_LIMITS: EffectiveDated<HuskyIncomeLimits>[] = [
  {
    effectiveFrom: "2026-03-01",
    value: {
      basis: "CT DSS Program Standards Chart, eff. 3/1/2026 (2026 HHS poverty guidelines)",
      adult138ByHouseholdSize: [183_600, 248_900, 314_200, 379_500, 444_900, 510_200, 575_500, 640_800],
      adult138EachAdditionalMember: 65_300,
      children201ByHouseholdSize: [267_400, 362_500, 457_700, 552_800, 647_900, 743_100, 838_200, 933_400],
      children201EachAdditionalMember: 95_200,
      pregnancy263ByHouseholdSize: [349_800, 474_300, 598_800, 723_300, 847_800, 972_300, 1_096_800, 1_221_200],
      pregnancy263EachAdditionalMember: 124_400,
    },
  },
];

/**
 * HUSKY A and HUSKY D are Medicaid, and Medicaid is qualified-immigrant
 * territory (`docs/ct-program-facts.md` §8: "Qualified-immigrant rules").
 * Both pass through `statusDependent`, exactly like SNAP and CEAP.
 *
 * Named exception, not implemented here and worth stating plainly: the same
 * table records that *State* HUSKY A/B for children is "effectively
 * status-blind, by design" — it exists specifically to cover children who
 * lack a qualifying status. This coarse implementation cannot separate a
 * child's route through HUSKY A from a parent's, so a household that answers
 * `"mixed"` loses the children's route to Indeterminate along with the
 * parent's — imprecise in the safe direction (a household that would still
 * screen likely-eligible sees "we can't tell" instead), but imprecise
 * nonetheless, and named here rather than silently done the easy way.
 */
export const screenHuskyA: ProgramRule = (profile, asOf) =>
  statusDependent(scoreHuskyA(profile, asOf), profile.immigrationStatus);

export const screenHuskyD: ProgramRule = (profile, asOf) =>
  statusDependent(scoreHuskyD(profile, asOf), profile.immigrationStatus);

/**
 * HUSKY A: coverage, never cash. Three independent routes onto the same
 * Program, each testing the same household income against its own FPL line —
 * parent/caretaker (only when a dependent child is in the home), the
 * dependent child themselves, and a pregnant member. A household can clear
 * one route and miss another (a family over the 138% parent line often clears
 * 201% for the children), so the outcome is likely-eligible the moment any
 * route does, and the unit is only the members that route actually covers.
 *
 * Age (and pregnancy) settle candidacy before income is ever asked for, the
 * same order CEAP's `vulnerabilityOf` uses: a household with nobody's age
 * known yet, and nobody recorded pregnant, has no route this function could
 * even test, so it never asks for income on HUSKY A's account at all.
 *
 * The parent/caretaker route covers every adult in the household once a
 * dependent child is present and income clears the line — not specifically
 * *that child's* parent or caretaker relative. Same gap `hasWorkingAdult` in
 * `programs/care-4-kids.ts` names for its own working-parent test, and for
 * the same reason: `Member` has no parent/guardian role beyond free-text
 * `relationship`, so there is nothing here to route on more precisely.
 */
const scoreHuskyA: ProgramRule = (profile, asOf) => {
  const table = inForceOn(HUSKY_INCOME_LIMITS, asOf);

  // No published table covers `asOf`. Nothing the Resident could say would
  // change that, so this blocks no facts — HUSKY A is simply not on the map.
  if (!table) return { programId: HUSKY_A, blockedBy: [] };

  // Nobody exists yet to test income for or route by household composition.
  // Unlike CEAP, `income-sources` is not requested yet either: HUSKY A does
  // not apply to every household the way CEAP does, and there is no route to
  // test income against until a member's age or pregnancy says there is one.
  if (profile.members.length === 0) return { programId: HUSKY_A, blockedBy: ["household-members"] };

  const { members } = profile;
  const dependentChildPresent = members.some(isDependentChild);

  const candidates = new Set<MemberId>();
  if (dependentChildPresent) for (const member of members.filter(isAdult)) candidates.add(member.id);
  for (const member of members.filter(isDependentChild)) candidates.add(member.id);
  for (const member of members.filter((m) => m.isPregnant === true)) candidates.add(member.id);

  // No member's age or pregnancy status yet supports any of the three routes.
  // Screened none of them, the same way SNAP screens nobody when every member
  // shares food apart from the Resident — absent from the map, not a guess.
  if (candidates.size === 0) return { programId: HUSKY_A, blockedBy: [] };

  const blockedBy = householdIncomeBlockers(members);
  if (blockedBy.length > 0) return { programId: HUSKY_A, blockedBy };

  const householdSize = members.length;
  const monthlyIncome = monthlyTotal(countedSources(members)) ?? 0;

  const covered = new Set<MemberId>();
  if (
    dependentChildPresent &&
    monthlyIncome <= limitFor(table.adult138ByHouseholdSize, table.adult138EachAdditionalMember, householdSize)
  ) {
    for (const member of members.filter(isAdult)) covered.add(member.id);
  }
  if (
    monthlyIncome <=
    limitFor(table.children201ByHouseholdSize, table.children201EachAdditionalMember, householdSize)
  ) {
    for (const member of members.filter(isDependentChild)) covered.add(member.id);
  }
  if (
    monthlyIncome <=
    limitFor(table.pregnancy263ByHouseholdSize, table.pregnancy263EachAdditionalMember, householdSize)
  ) {
    for (const member of members.filter((m) => m.isPregnant === true)) covered.add(member.id);
  }

  if (covered.size === 0) {
    return {
      programId: HUSKY_A,
      blockedBy: [],
      // The full candidate population, not an empty list — "who this Program
      // would count" is about identity and category, not about whether the
      // income test just applied happened to clear (same reasoning as SNAP
      // and CEAP reporting their unit on a likely-ineligible entry).
      result: { programId: HUSKY_A, outcome: "likely-ineligible", unit: [...candidates], blockedBy: [] },
    };
  }

  return {
    programId: HUSKY_A,
    blockedBy: [],
    result: {
      programId: HUSKY_A,
      outcome: "likely-eligible",
      unit: [...covered],
      noFigureReason: "coverage-not-cash",
      blockedBy: [],
    },
  };
};

/**
 * HUSKY D: coverage, never cash, for adults 19–64 with no dependent child in
 * the home. Shares its 138% FPL line with HUSKY A's parent/caretaker route —
 * the two are the same income test, routed by household composition rather
 * than by income (`docs/ct-program-facts.md` §2).
 *
 * Out of scope and named rather than silently missing: a household member 65
 * or older with no dependent child in the home is neither HUSKY D (the "19–64"
 * ceiling in its own name) nor covered by HUSKY A's child/pregnancy routes.
 * That population's real coverage is HUSKY C, priced against a Medically Needy
 * Income Limit this module does not implement.
 */
const scoreHuskyD: ProgramRule = (profile, asOf) => {
  const table = inForceOn(HUSKY_INCOME_LIMITS, asOf);

  if (!table) return { programId: HUSKY_D, blockedBy: [] };
  if (profile.members.length === 0) return { programId: HUSKY_D, blockedBy: ["household-members"] };

  const { members } = profile;

  // A dependent child in the home means every adult here routes to HUSKY A
  // instead — HUSKY D simply does not apply, and no fact would change that.
  if (members.some(isDependentChild)) return { programId: HUSKY_D, blockedBy: [] };

  const adults = members.filter(isAdult19to64);
  if (adults.length === 0) return { programId: HUSKY_D, blockedBy: [] };

  const blockedBy = householdIncomeBlockers(members);
  if (blockedBy.length > 0) return { programId: HUSKY_D, blockedBy };

  const householdSize = members.length;
  const monthlyIncome = monthlyTotal(countedSources(members)) ?? 0;

  if (
    monthlyIncome > limitFor(table.adult138ByHouseholdSize, table.adult138EachAdditionalMember, householdSize)
  ) {
    return {
      programId: HUSKY_D,
      blockedBy: [],
      result: {
        programId: HUSKY_D,
        outcome: "likely-ineligible",
        unit: adults.map((member) => member.id),
        blockedBy: [],
      },
    };
  }

  return {
    programId: HUSKY_D,
    blockedBy: [],
    result: {
      programId: HUSKY_D,
      outcome: "likely-eligible",
      unit: adults.map((member) => member.id),
      noFigureReason: "coverage-not-cash",
      blockedBy: [],
    },
  };
};

function isDependentChild(member: Member): boolean {
  return member.age !== undefined && member.age < 19;
}

function isAdult(member: Member): boolean {
  return member.age !== undefined && member.age >= 19;
}

function isAdult19to64(member: Member): boolean {
  return member.age !== undefined && member.age >= 19 && member.age <= 64;
}

function limitFor(byHouseholdSize: Money[], eachAdditionalMember: Money, householdSize: number): Money {
  const tabulated = byHouseholdSize[householdSize - 1];
  if (tabulated !== undefined) return tabulated;

  const largest = byHouseholdSize[byHouseholdSize.length - 1]!;
  return largest + eachAdditionalMember * (householdSize - byHouseholdSize.length);
}
