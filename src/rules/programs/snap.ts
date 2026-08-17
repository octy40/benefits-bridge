import { inForceOn, type EffectiveDated } from "../effective-dated";
import { monthlyTotal, needsWorkHours } from "../income";
import { statusDependent } from "../immigration-status";
import type { ProgramRule } from "../program-rule";
import type {
  FactId,
  IncomeSource,
  IncomeType,
  Member,
  Money,
  ProgramId,
  UtilityPaid,
} from "../types";

export const SNAP: ProgramId = "snap";

type GrossIncomeLimits = {
  /** Monthly limit by Program unit size, index 0 being a unit of one. */
  byUnitSize: Money[];
  eachAdditionalMember: Money;
};

/**
 * Connecticut screens SNAP under **broad-based categorical eligibility at 200%
 * of the federal poverty level**. The federal 130% gross-income test does not
 * gate CT applicants — in Connecticut 130% is only the threshold at which a
 * household must *report* an income change.
 *
 * This is the single most consequential CT nuance in the product. A screener
 * built on the federal test wrongly turns away a large share of Stamford, and
 * it is the error a Connecticut civic-tech audience is most likely to catch.
 *
 * FY2026, in force 10/1/2025 – 9/30/2026. Sources, both carrying identical
 * figures and both naming the 200% BBCE standard:
 *  - CT DSS Program Standards Chart eff. 7/1/2026, SNAP columns marked eff. 10/1/2025
 *    https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/fact-sheets-and-issue-briefs/fact-sheets/dss-program-standards-chart-effective-070126.pdf
 *  - CT DSS SNAP eligibility page
 *    https://portal.ct.gov/dss/snap/supplemental-nutrition-assistance-program---snap/eligibility
 *
 * There is deliberately no FY2027 row. As of 2026-08-14 USDA FNS had not
 * published the FY2027 COLA memo, and an invented row is exactly the figure
 * nobody can defend. Screening simply stops covering SNAP on 10/1/2026 until
 * the real numbers are added here — a data change, not a code change.
 */
const CT_GROSS_INCOME_LIMITS: EffectiveDated<GrossIncomeLimits>[] = [
  {
    effectiveFrom: "2025-10-01",
    effectiveTo: "2026-09-30",
    value: {
      byUnitSize: [260_900, 352_500, 444_200, 535_900, 627_500, 719_200, 810_900, 902_500],
      eachAdditionalMember: 91_700,
    },
  },
];

type AllotmentFigures = {
  /** How the period is named wherever a figure derived from this row is quoted. */
  basis: string;
  /** Maximum monthly allotment by Program unit size, index 0 being a unit of one. */
  maximumAllotmentByUnitSize: Money[];
  maximumAllotmentEachAdditionalMember: Money;
  /**
   * Standard deduction by unit size. The last entry applies to that size *and
   * every larger unit* — the agency tabulates "6 or more", not "6".
   */
  standardDeductionByUnitSize: Money[];
  /** A proportion, not an amount: 0.2 is the 20% of gross earned income. */
  earnedIncomeDeductionRate: number;
  /** A proportion: the share of adjusted income a household is expected to put toward shelter. */
  shelterCostShareOfAdjustedIncome: number;
  excessShelterCap: Money;
  /** A proportion: the share of net income subtracted from the maximum allotment. */
  netIncomeContributionRate: number;
  minimumAllotment: Money;
  /** The largest unit the minimum allotment reaches. */
  minimumAllotmentLargestUnitSize: number;
};

/**
 * The federal SNAP figures the allotment is computed from: **48 States & DC**,
 * which is the group Connecticut belongs to. FY2026, in force 10/1/2025 –
 * 9/30/2026.
 *
 * Source: USDA FY2026 SNAP COLA memo, dated 13 August 2025 —
 * https://www.fna.usda.gov/snap/allotment/cola
 * (The agency has been renamed from FNS to FNA; `fns.usda.gov` now
 * 301-redirects to `fna.usda.gov`, so older links in this repo's research notes
 * still resolve but no longer name the agency correctly.)
 *
 * Cross-checked against the CT DSS Program Standards Chart cited above, which
 * carries the same maximum allotment and standard deduction columns.
 *
 * Two figures worth guarding:
 *  - the each-additional-person increment is **$218**. Several secondary
 *    sources print $224 for FY2026; the COLA memo and the CT DSS chart both say
 *    $218, and it is the single easiest number in this file to get wrong;
 *  - the standard deduction is flat across unit sizes 1, 2 and 3, so a table
 *    keyed by size looks suspiciously repetitive and is correct.
 *
 * There is deliberately no FY2027 row, for the reason given on
 * `CT_GROSS_INCOME_LIMITS`. The FY2026 memo was dated 13 August 2025, so its
 * FY2027 counterpart is due imminently and this table should be re-checked
 * before 2026-10-01.
 */
const SNAP_ALLOTMENT_FIGURES: EffectiveDated<AllotmentFigures>[] = [
  {
    effectiveFrom: "2025-10-01",
    effectiveTo: "2026-09-30",
    value: {
      basis: "FY2026 figures (October 2025 – September 2026)",
      maximumAllotmentByUnitSize: [
        29_800, 54_600, 78_500, 99_400, 118_300, 142_100, 157_100, 178_900,
      ],
      maximumAllotmentEachAdditionalMember: 21_800,
      standardDeductionByUnitSize: [20_900, 20_900, 20_900, 22_300, 26_100, 29_900],
      // 20% of gross earned income — 7 CFR 273.9(d)(2).
      earnedIncomeDeductionRate: 0.2,
      // Shelter costs above half of income-after-other-deductions are excess —
      // 7 CFR 273.9(d)(6)(ii).
      shelterCostShareOfAdjustedIncome: 0.5,
      excessShelterCap: 74_400,
      // 30% of net monthly income — 7 CFR 273.10(e)(2)(ii)(A).
      netIncomeContributionRate: 0.3,
      // The minimum allotment, published in the same COLA memo as the maximums
      // above. It reaches one- and two-person units only; a unit of three or
      // more that computes to zero receives zero (7 CFR 273.10(e)(2)(ii), which
      // is cited at paragraph level deliberately — the subparagraph letter was
      // not confirmed against the current eCFR text).
      minimumAllotment: 2_400,
      minimumAllotmentLargestUnitSize: 2,
    },
  },
];

type UtilityAllowances = {
  /** The Standard Utility Allowance: the heating/cooling allowance. */
  standard: Money;
  limited: Money;
  telephone: Money;
};

/**
 * Connecticut's utility allowances, FY2026.
 *
 * Source: CT DSS Program Standards Chart —
 * https://portal.ct.gov/dss/-/media/departments-and-agencies/dss/fact-sheets-and-issue-briefs/fact-sheets/dss-program-standards-chart-effective-070126.pdf
 * The identical allowance block appears on the chart headed "as of 10/1/2025"
 * and on the one headed "as of 7/1/2026", so there is no mid-year split to
 * model — one row covers the whole fiscal year.
 *
 * The row is nonetheless closed on 9/30/2026 rather than left open-ended, even
 * though CT's own 7/1/2026 chart carries these figures past that date. The
 * allotment they feed into stops on 9/30/2026, so an open-ended row here would
 * only ever be half of a computation whose other half had expired.
 *
 * The three are mutually exclusive: a household gets exactly one
 * (7 CFR 273.9(d)(6)(iii)). Connecticut is a **mandatory-SUA state** — a
 * household with a heating or cooling cost uses the SUA rather than its actual
 * bills, so a resident's real utility statements never enter this calculation.
 *
 * Caution, recorded because it looks like it applies here and does not: OBBBA
 * (P.L. 119-21) §10103 limits the *LIHEAP-based* route to the SUA to households
 * containing an elderly or disabled member. That route is the one where a
 * nominal LIHEAP payment substitutes for an actual heating cost. A household
 * that genuinely pays a heating bill — which is the case this module screens —
 * reaches the SUA on its own and is untouched by §10103. Cited to the statute
 * rather than to eCFR 273.9, which has not been amended for it.
 */
const CT_UTILITY_ALLOWANCES: EffectiveDated<UtilityAllowances>[] = [
  {
    effectiveFrom: "2025-10-01",
    effectiveTo: "2026-09-30",
    value: { standard: 97_600, limited: 43_000, telephone: 3_600 },
  },
];

/**
 * Which income types SNAP counts as **earned**, and therefore which ones the
 * 20% earned income deduction applies to (7 CFR 273.9(b)(1), 273.9(d)(2)).
 *
 * Written as a total map over `IncomeType` so a new income type cannot be added
 * without someone deciding which side of this line it falls on. Getting it
 * wrong is worth about 6% of the stream in monthly allotment, in the direction
 * of a figure the household will not receive.
 *
 * Two calls worth stating:
 *
 *  - `cash-self-employment` is earned. Real SNAP allows a cost-of-business
 *    offset against self-employment receipts (7 CFR 273.11(a)) before counting
 *    them, and BenefitBridge does not ask for business costs, so it counts
 *    gross cash receipts as though they were net. That **overstates** countable
 *    income and therefore understates the allotment — the safe direction for a
 *    figure that has to be defensible, but it is an approximation and not the
 *    rule.
 *  - `other` is treated as unearned. It is what the conversation reaches for
 *    when it cannot classify a stream, and withholding the deduction from an
 *    unclassified stream understates the allotment rather than overstating it.
 */
const IS_EARNED_INCOME: Record<IncomeType, boolean> = {
  wages: true,
  "cash-self-employment": true,
  "social-security": false,
  ssi: false,
  unemployment: false,
  "child-support": false,
  other: false,
};

/**
 * SNAP is status-dependent, so its whole score passes through
 * `statusDependent` — one wrap at the seam rather than a branch on every
 * return path inside `scoreSnap`, because a path that forgot it would look
 * like a correct score.
 *
 * The eligible set is narrow and was narrowed again in November 2025 by H.R.1 /
 * OBBBA: legal permanent residents (subject to a five-year wait with a long
 * list of exceptions), Cuban/Haitian entrants, and citizens of the Compacts of
 * Free Association. Refugees, asylees, trafficking victims and humanitarian
 * parolees, who qualified before, no longer do.
 *  - CT DSS, *What will change with DSS benefits following the passing of
 *    federal H.R.1?* https://portal.ct.gov/dss/knowledge-base/articles/general-information/federal-updates-hr1
 *  - USDA FNS https://www.fns.usda.gov/snap/obbb-alien-eligibility
 *  - `docs/ct-program-facts.md` §8 carries the same table for every Program.
 *
 * None of that is implemented, and deliberately so: BenefitBridge asks one
 * optional household-level question and cannot evaluate any of these categories
 * per member (ADR-0004). What matters here is that a household whose answer is
 * `"mixed"` is **not** screened out — under 7 CFR 273.11(c)(3) an ineligible
 * member is dropped from the Program unit and their income is still counted, so
 * the citizen children of a mixed-status household remain eligible for a
 * smaller allotment this module cannot compute. Unscorable, not ineligible.
 */
export const screenSnap: ProgramRule = (profile, asOf) =>
  statusDependent(scoreSnap(profile, asOf), profile.immigrationStatus);

/**
 * SNAP's screen: derive the Program unit, total its gross monthly income,
 * compare it against Connecticut's limit for a unit that size, and — once the
 * household's shelter costs are known — compute the monthly allotment.
 *
 * The two halves block differently, and the difference is deliberate. Facts
 * needed to *score the outcome* (who is in the household, who eats together,
 * what comes in) leave SNAP off the map entirely until they arrive, because a
 * Program with an unknown outcome is not a Program to show. Facts needed only
 * to *compute the figure* (rent, utilities) leave SNAP on the map in tier 2,
 * scored likely-eligible with no `figures` and the missing fact named in
 * `blockedBy`. It moves to tier 1 when the fact lands, so the panel reads as a
 * figure being refined rather than as one that will not sit still.
 *
 * Immigration status is absent from both halves on purpose. Every Blocking fact
 * here is one Elicitation will go and get; status is asked at most once and
 * never chased, so it is applied outside this function entirely.
 */
const scoreSnap: ProgramRule = (profile, asOf) => {
  const limits = inForceOn(CT_GROSS_INCOME_LIMITS, asOf);
  const allotmentFigures = inForceOn(SNAP_ALLOTMENT_FIGURES, asOf);
  const utilityAllowances = inForceOn(CT_UTILITY_ALLOWANCES, asOf);

  // No published figures covering `asOf`. Nothing the Resident could tell us
  // would change that, so this blocks no facts — SNAP is simply not on the map.
  // All three tables run to the same fiscal year, so in practice they go
  // missing together; they are checked together rather than assumed to.
  if (!limits || !allotmentFigures || !utilityAllowances) return { programId: SNAP, blockedBy: [] };

  // The opening of a conversation: nothing is known, so everything SNAP needs
  // is missing. Which of these gets asked first is the ask-order tie-break's
  // job, not this module's.
  if (profile.members.length === 0) {
    return { programId: SNAP, blockedBy: ["household-members", "food-sharing", "income-sources"] };
  }

  const unit = snapUnit(profile.members);
  const blockedBy: FactId[] = [];

  if (!unit) blockedBy.push("food-sharing");

  // Until the unit is known, SNAP needs income from everyone it might count.
  // Once it is known, a member outside the unit can keep their income to
  // themselves — which is ADR-0003 paying for itself: the same fact is
  // required by one Program and irrelevant to another.
  const counted = unit ?? profile.members;
  if (counted.some((member) => member.incomeSources === undefined)) blockedBy.push("income-sources");
  if (needsWorkHours(countedSources(counted))) blockedBy.push("work-hours");

  if (!unit || blockedBy.length > 0) return { programId: SNAP, blockedBy };

  // Every member said they buy and prepare food apart from the Resident.
  // Real SNAP would make each of them their own household; BenefitBridge
  // screens none of them rather than screening the wrong unit.
  if (unit.length === 0) return { programId: SNAP, blockedBy: [] };

  const sources = countedSources(unit);
  const grossMonthlyIncome = monthlyTotal(sources) ?? 0;
  const members = unit.map((member) => member.id);

  if (grossMonthlyIncome > grossIncomeLimit(limits, unit.length)) {
    return {
      programId: SNAP,
      blockedBy: [],
      result: { programId: SNAP, outcome: "likely-ineligible", unit: members, blockedBy: [] },
    };
  }

  // Scored likely-eligible. What is still missing from here on costs a figure,
  // not an outcome — so it is reported on a `ProgramResult` that is on the map
  // rather than by withholding one. Only a household that is going to be
  // offered a figure is asked these: a likely-ineligible household is owed no
  // allotment, and asking it for rent would put a question into the
  // conversation that buys the Resident nothing.
  const { monthlyRent, utilitiesPaid } = profile;
  const figureBlockedBy: FactId[] = [];
  if (monthlyRent === undefined) figureBlockedBy.push("rent");
  if (utilitiesPaid === undefined) figureBlockedBy.push("utility-costs");

  if (monthlyRent === undefined || utilitiesPaid === undefined) {
    return {
      programId: SNAP,
      // Reported at the screening level too, so `rankBlockingFacts` still puts
      // them on Elicitation's agenda (ADR-0002). A figure nobody goes and asks
      // for never arrives.
      blockedBy: figureBlockedBy,
      result: {
        programId: SNAP,
        outcome: "likely-eligible",
        unit: members,
        blockedBy: figureBlockedBy,
      },
    };
  }

  const monthly = monthlyAllotment(
    sources,
    unit.length,
    monthlyRent,
    utilitiesPaid,
    allotmentFigures,
    utilityAllowances,
  );

  // A unit of three or more whose allotment computes to zero receives nothing.
  // Reported as likely-ineligible so the entry leaves the map altogether: a
  // tier-1 line reading "$0 a year" is not a defensible figure, and the map is
  // a list of things worth doing (CONTEXT.md, *Eligibility map*).
  if (monthly === 0) {
    return {
      programId: SNAP,
      blockedBy: [],
      result: { programId: SNAP, outcome: "likely-ineligible", unit: members, blockedBy: [] },
    };
  }

  return {
    programId: SNAP,
    blockedBy: [],
    result: {
      programId: SNAP,
      outcome: "likely-eligible",
      unit: members,
      // Every derived form the conversation could need, computed here so the
      // model never multiplies by twelve (ADR-0010).
      figures: { monthly, annual: monthly * 12, basis: allotmentFigures.basis },
      blockedBy: [],
    },
  };
};

/**
 * The monthly allotment: the maximum for a unit this size, less 30% of net
 * monthly income (7 CFR 273.10(e)(2)).
 *
 * Net income is gross income less, in order: the 20% earned income deduction,
 * the standard deduction for the unit size, and the excess shelter deduction
 * (7 CFR 273.9(d)). Cents survive the whole chain — the only rounding the
 * regulation compels is the one on the 30% product below, and USDA's own worked
 * example carries $1,047.50 of net income into it, which is how we know cents
 * are meant to get that far.
 *
 * Out of scope and named so a reader does not go looking: the medical expense
 * deduction (elderly/disabled only), the homeless shelter deduction, the child
 * support paid deduction, and the dependent care deduction. Each would enter
 * this chain between the standard and shelter deductions.
 */
function monthlyAllotment(
  sources: IncomeSource[],
  unitSize: number,
  monthlyRent: Money,
  utilitiesPaid: UtilityPaid[],
  figures: AllotmentFigures,
  allowances: UtilityAllowances,
): Money {
  const grossEarnedIncome = monthlyTotal(sources.filter((source) => IS_EARNED_INCOME[source.type])) ?? 0;
  const grossIncome = monthlyTotal(sources) ?? 0;

  const earnedIncomeDeduction = Math.round(grossEarnedIncome * figures.earnedIncomeDeductionRate);
  const standardDeduction = standardDeductionFor(figures, unitSize);

  // "Income after all other deductions" is the base the shelter test measures
  // against — the shelter deduction is the only one computed from a figure the
  // others have already reduced.
  const adjustedIncome = Math.max(0, grossIncome - earnedIncomeDeduction - standardDeduction);

  // Shelter costs are rent plus the applicable utility allowance. In a
  // mandatory-SUA state the allowance stands in for the household's actual
  // utility bills rather than sitting alongside them.
  const shelterCosts = monthlyRent + utilityAllowanceFor(allowances, utilitiesPaid);
  const excessShelter = Math.max(
    0,
    shelterCosts - Math.round(adjustedIncome * figures.shelterCostShareOfAdjustedIncome),
  );

  const netIncome = Math.max(0, adjustedIncome - applyShelterCap(excessShelter, figures.excessShelterCap));

  // 7 CFR 273.10(e)(2)(ii)(A) lets a state either round this product **up** to
  // the next whole dollar, or leave it unrounded and round the final allotment
  // down. Connecticut takes the first.
  //
  // Sourcing caveat, stated plainly because it is a real uncertainty: the only
  // sourcing found for Connecticut's election is DSS form W-1216 Rev. 10/21,
  // whose own printed dollar figures are five years stale. The *method* on that
  // form is sound and the regulation offers only these two options, but the
  // citation is old and nobody has confirmed CT still elects this way. The two
  // elections rarely diverge — in USDA's own worked example ($994 maximum, less
  // 30% of $1,047.50 net) both land on $679 — so the exposure is a dollar,
  // occasionally, not a wrong figure. Worth re-confirming against a current CT
  // policy manual before anyone relies on it.
  const contribution = roundUpToWholeDollar(netIncome * figures.netIncomeContributionRate);

  const allotment = Math.max(0, maximumAllotment(figures, unitSize) - contribution);

  // The minimum allotment reaches one- and two-person units only.
  //
  // Out of scope and deliberately not implemented: the minimum does *not* apply
  // in a household's initial month of certification, so a one- or two-person
  // household applying today may see nothing in month one and $24 thereafter.
  // BenefitBridge screens rather than certifies and has no notion of an initial
  // month, so it quotes the ongoing figure.
  if (unitSize <= figures.minimumAllotmentLargestUnitSize) {
    return Math.max(allotment, figures.minimumAllotment);
  }

  return allotment;
}

/**
 * The excess shelter deduction, capped.
 *
 * Verified and deliberately deferred: for a unit containing an elderly or
 * disabled member the cap is **removed entirely**, not raised. 7 CFR
 * 273.9(d)(6)(ii) applies the limit only "if the household does not contain an
 * elderly or disabled member", and 273.10(e)(1)(i)(I) gives such a household
 * the full amount of shelter costs above 50% of its income.
 *
 * That is issue #17's scope, gated on issue #10, and implementing it here would
 * mean adding a disability field to `Member` and branching on age — neither of
 * which any Program currently asks for. This function exists as a seam so that
 * work is a parameter and a line, not a rewrite of the chain above: it is also
 * the reason the demo's second act works, since a grandmother moving in is
 * exactly the household that loses this cap.
 */
function applyShelterCap(excessShelter: Money, cap: Money): Money {
  return Math.min(excessShelter, cap);
}

/**
 * Which utility allowance a household gets. Exactly one, or none
 * (7 CFR 273.9(d)(6)(iii)).
 *
 * A heating or cooling cost buys the SUA and nothing else is considered —
 * Connecticut mandates it. Failing that, two or more other utilities buy the
 * Limited allowance and a phone bill alone buys the Telephone one; those two
 * thresholds are the federal structure rather than a sourced CT rule, and are
 * the least well-evidenced lines in this file. The SUA path — the one Maria and
 * most Stamford renters take — is the sourced one.
 *
 * `internet` counts toward nothing: OBBBA (P.L. 119-21) §10104 bars internet
 * service fees from the shelter deduction, so it cannot be one of the two
 * utilities that qualify a household for the Limited allowance either. eCFR
 * 273.9 still reads as though it were allowable; the statute governs.
 */
function utilityAllowanceFor(allowances: UtilityAllowances, utilitiesPaid: UtilityPaid[]): Money {
  if (utilitiesPaid.includes("heat") || utilitiesPaid.includes("air-conditioning")) {
    return allowances.standard;
  }

  const countable = utilitiesPaid.filter((utility) => utility !== "internet");

  if (countable.filter((utility) => utility !== "phone").length >= 2) return allowances.limited;
  if (countable.includes("phone")) return allowances.telephone;

  return 0;
}

/**
 * Who SNAP counts: the people who purchase and prepare food together.
 *
 * `undefined` means the household has not said yet. A one-person household is
 * exempt from the question — there is nobody to share food purchase and
 * preparation *with*, and asking would be the kind of category question
 * Elicitation exists to avoid.
 */
function snapUnit(members: Member[]): Member[] | undefined {
  if (members.length === 1) return members;
  if (members.some((member) => member.sharesFoodPurchaseAndPreparation === undefined)) return undefined;
  return members.filter((member) => member.sharesFoodPurchaseAndPreparation);
}

/**
 * Every source of every counted member. SNAP's *gross* test draws no
 * distinction between earned and unearned income — that split appears in the
 * net calculation, where the 20% earned-income deduction lives.
 */
function countedSources(members: Member[]) {
  return members.flatMap((member) => member.incomeSources ?? []);
}

function grossIncomeLimit(limits: GrossIncomeLimits, unitSize: number): Money {
  const tabulated = limits.byUnitSize[unitSize - 1];
  if (tabulated !== undefined) return tabulated;

  const largest = limits.byUnitSize[limits.byUnitSize.length - 1]!;
  return largest + limits.eachAdditionalMember * (unitSize - limits.byUnitSize.length);
}

function maximumAllotment(figures: AllotmentFigures, unitSize: number): Money {
  const tabulated = figures.maximumAllotmentByUnitSize[unitSize - 1];
  if (tabulated !== undefined) return tabulated;

  const largest = figures.maximumAllotmentByUnitSize[figures.maximumAllotmentByUnitSize.length - 1]!;
  return (
    largest +
    figures.maximumAllotmentEachAdditionalMember * (unitSize - figures.maximumAllotmentByUnitSize.length)
  );
}

/**
 * The standard deduction. Unlike the tables above there is no per-person
 * increment past the end: the agency's largest row is "6 or more", so the last
 * entry is the answer for every larger unit.
 */
function standardDeductionFor(figures: AllotmentFigures, unitSize: number): Money {
  const tabulated = figures.standardDeductionByUnitSize[unitSize - 1];
  if (tabulated !== undefined) return tabulated;

  return figures.standardDeductionByUnitSize[figures.standardDeductionByUnitSize.length - 1]!;
}

/**
 * Money is cents, so "the next whole dollar" is the next multiple of 100.
 *
 * The product is settled to whole cents before being rounded up, because a
 * percentage of an integer is a float and a float a hair above a whole dollar
 * rounds up to the *next* one — a dollar a month the household does not get.
 * No net income in the range this table can produce actually lands there (the
 * search was run), so this is a guard and not a fix: the alternative is a line
 * whose correctness rests on a property of IEEE 754 that a reader would have to
 * go and verify.
 */
function roundUpToWholeDollar(cents: number): Money {
  return Math.ceil(Math.round(cents) / 100) * 100;
}
