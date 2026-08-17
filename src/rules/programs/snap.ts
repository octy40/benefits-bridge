import { inForceOn, type EffectiveDated } from "../effective-dated";
import { monthlyTotal, needsWorkHours } from "../income";
import type { ProgramRule } from "../program-rule";
import type { FactId, Member, Money, ProgramId } from "../types";

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

/**
 * SNAP's screen: derive the Program unit, total its gross monthly income, and
 * compare it against Connecticut's limit for a unit that size.
 *
 * No dollar figure yet — the allotment is its own ticket. What lands here is
 * the machinery every later Program reuses.
 */
export const screenSnap: ProgramRule = (profile, asOf) => {
  const limits = inForceOn(CT_GROSS_INCOME_LIMITS, asOf);

  // No published figures covering `asOf`. Nothing the Resident could tell us
  // would change that, so this blocks no facts — SNAP is simply not on the map.
  if (!limits) return { programId: SNAP, blockedBy: [] };

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

  const grossMonthlyIncome = monthlyTotal(countedSources(unit)) ?? 0;

  return {
    programId: SNAP,
    blockedBy: [],
    result: {
      programId: SNAP,
      outcome: grossMonthlyIncome <= grossIncomeLimit(limits, unit.length)
        ? "likely-eligible"
        : "likely-ineligible",
      unit: unit.map((member) => member.id),
      // No figures. The allotment needs the net-income calculation — earned
      // income deduction, standard deduction, excess shelter — and arrives
      // with it.
      blockedBy: [],
    },
  };
};

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
