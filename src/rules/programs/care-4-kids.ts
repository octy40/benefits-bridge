import { inForceOn, type EffectiveDated } from "../effective-dated";
import { monthlyTotal, needsWorkHours } from "../income";
import { statusDependent } from "../immigration-status";
import type { ProgramRule } from "../program-rule";
import type { FactId, Member, Money, ProgramId } from "../types";

export const CARE_4_KIDS: ProgramId = "care-4-kids";

/**
 * Snapshot of the live enrollment-list status page, not a fiscal-year table —
 * Care 4 Kids' queue moves continuously rather than resetting on a schedule,
 * so there is no `effectiveTo` to give it. `docs/ct-program-facts.md` §3, "as
 * of August 4, 2026": inviting applications received on or before September
 * 15, 2025, typical wait "about 8 months". **Stale the moment it is read** —
 * revisit against https://www.ctcare4kids.com/provider-information/status/waitlist/
 * before relying on it for anything but a demo.
 */
const WAITLIST_STATUS = {
  typicalWaitMonths: 8,
  invitingApplicationsReceivedBy: "2025-09-15",
};

/**
 * 60% of State Median Income, the entry-application ceiling
 * (`docs/ct-program-facts.md` §3). **The identical FFY2026 table CEAP uses**
 * (`programs/ceap.ts`'s `smiLimitByHouseholdSize`) — the same source names
 * both Programs against it: "used by CEAP 2025-26 season **and** Care 4 Kids
 * from 10/1/2025" (§0). Kept as its own copy rather than a shared import,
 * which was judged out of scope for this ticket; if this table is ever
 * corrected, `programs/ceap.ts`'s matching table must be corrected with it.
 *
 * Unlike CEAP's fact sheet, Care 4 Kids' own income-guidelines page tabulates
 * four sizes past CEAP's eight (`docs/ct-program-facts.md` §3), so they are
 * carried here rather than extrapolated.
 */
const CARE_4_KIDS_INCOME_LIMITS: EffectiveDated<Money[]>[] = [
  {
    effectiveFrom: "2025-10-01",
    effectiveTo: "2026-09-30",
    value: [
      4_776_400, 6_246_000, 7_715_700, 9_185_400, 10_655_000, 12_124_700, 12_400_200, 12_675_800,
      12_951_400, 13_226_900, 13_502_500, 13_778_100,
    ],
  },
];

/**
 * Care 4 Kids is status-dependent on the child alone
 * (`docs/ct-program-facts.md` §8: "the citizenship status of the child's
 * parents or other family members is not taken into consideration"). This
 * coarse implementation cannot isolate the child's status from the rest of
 * the household's, so it passes through `statusDependent` like every other
 * status-dependent Program — imprecise in the safe direction (a household
 * whose only non-qualifying member is a parent, which the law disregards
 * entirely here, still lands on Indeterminate), and named for the same reason
 * `husky.ts` names its own version of this gap.
 */
export const screenCare4Kids: ProgramRule = (profile, asOf) =>
  statusDependent(scoreCare4Kids(profile, asOf), profile.immigrationStatus);

/**
 * Care 4 Kids: waitlisted, never a figure. `docs/ct-program-facts.md` §3's
 * own product note is the reason there is no dollar amount to price at all —
 * the state's payment-rate schedules were not machine-readable in that
 * research pass, and the queue is the fact that actually matters to a
 * Resident deciding whether to apply.
 *
 * Three gates, checked in the order that asks for the least first: whether a
 * qualifying child exists (age alone, mostly), then income, then a working
 * parent. A household with no qualifying child is never asked for income on
 * Care 4 Kids' account, the same ordering `husky.ts` uses.
 */
const scoreCare4Kids: ProgramRule = (profile, asOf) => {
  const limits = inForceOn(CARE_4_KIDS_INCOME_LIMITS, asOf);

  if (!limits) return { programId: CARE_4_KIDS, blockedBy: [] };
  if (profile.members.length === 0) return { programId: CARE_4_KIDS, blockedBy: ["household-members"] };

  const { members } = profile;
  const eligibleChild = qualifyingChildStatus(members);

  // No age yet supports a qualifying child, and nothing about age is a
  // Blocking fact anywhere in this module (CEAP's `vulnerabilityOf` never
  // asks for it either) — simply not on the map.
  if (eligibleChild === false) return { programId: CARE_4_KIDS, blockedBy: [] };

  // A member aged 13–18 is the only thing left that could produce a
  // qualifying child, and only their disability status decides it —
  // `disability` already exists as a Blocking fact for exactly this shape of
  // question (`programs/ceap.ts`), reused here rather than duplicated.
  if (eligibleChild === undefined) return { programId: CARE_4_KIDS, blockedBy: ["disability"] };

  const blockedBy = householdIncomeBlockers(members);
  if (blockedBy.length > 0) return { programId: CARE_4_KIDS, blockedBy };

  const qualifyingChildren = members.filter(isQualifyingChild).map((member) => member.id);
  const householdSize = members.length;
  const annualIncome = (monthlyTotal(countedSources(members)) ?? 0) * 12;

  if (annualIncome > limitFor(limits, householdSize)) {
    return {
      programId: CARE_4_KIDS,
      blockedBy: [],
      result: { programId: CARE_4_KIDS, outcome: "likely-ineligible", unit: qualifyingChildren, blockedBy: [] },
    };
  }

  // Working parent or studying parent both qualify (`docs/ct-program-facts.md`
  // §3); only "working" is detectable here, from earned income already known
  // by this point. A parent in an approved education or training activity
  // with no earned income is a named gap, not a silent one: this household
  // screens likely-ineligible rather than sitting forever unresolved, because
  // nothing in the Household profile could ever tell this module "studying".
  if (!hasWorkingAdult(members)) {
    return {
      programId: CARE_4_KIDS,
      blockedBy: [],
      result: { programId: CARE_4_KIDS, outcome: "likely-ineligible", unit: qualifyingChildren, blockedBy: [] },
    };
  }

  return {
    programId: CARE_4_KIDS,
    blockedBy: [],
    result: {
      programId: CARE_4_KIDS,
      outcome: "likely-eligible",
      unit: qualifyingChildren,
      noFigureReason: "waitlisted",
      waitlist: WAITLIST_STATUS,
      blockedBy: [],
    },
  };
};

/**
 * A child under 13, or under 19 with special needs — `hasDisability` standing
 * in for the agency's own special-needs category (`types.ts`). Same
 * three-step shape as `vulnerabilityOf` in `programs/ceap.ts`: the definite
 * `true` conditions are checked across every member first, so one household
 * member's unresolved disability status never hides another's already-settled
 * younger sibling.
 */
function qualifyingChildStatus(members: Member[]): boolean | undefined {
  if (members.some((member) => member.age !== undefined && member.age < 13)) return true;
  if (members.some((member) => member.age !== undefined && member.age < 19 && member.hasDisability === true)) {
    return true;
  }
  if (members.some((member) => member.age !== undefined && member.age < 19 && member.hasDisability === undefined)) {
    return undefined;
  }

  return false;
}

function isQualifyingChild(member: Member): boolean {
  if (member.age === undefined) return false;
  return member.age < 13 || (member.age < 19 && member.hasDisability === true);
}

/**
 * "Working" is read from income source *type* alone, never from
 * `needsWorkHours` — an hourly wage source with no hours yet still proves
 * someone works, even though it cannot yet price anything. Whether this
 * income belongs to a parent specifically is not modelled: `Member` carries
 * no parent/guardian role beyond free-text `relationship`, so any earned
 * income anywhere in the household is read as satisfying this test.
 */
function hasWorkingAdult(members: Member[]): boolean {
  return members.some((member) =>
    (member.incomeSources ?? []).some(
      (source) => source.type === "wages" || source.type === "cash-self-employment",
    ),
  );
}

function countedSources(members: Member[]) {
  return members.flatMap((member) => member.incomeSources ?? []);
}

function householdIncomeBlockers(members: Member[]): FactId[] {
  const blockedBy: FactId[] = [];
  if (members.some((member) => member.incomeSources === undefined)) blockedBy.push("income-sources");
  if (needsWorkHours(countedSources(members))) blockedBy.push("work-hours");
  return blockedBy;
}

function limitFor(byHouseholdSize: Money[], householdSize: number): Money {
  const tabulated = byHouseholdSize[householdSize - 1];
  if (tabulated !== undefined) return tabulated;

  // No per-additional-member figure is published for this table (unlike
  // SNAP's and the FPL table's own +1 rows), so a household larger than the
  // tabulated twelve holds at the size-twelve ceiling — conservative in the
  // direction of a lower eligibility ceiling, same call `ceap.ts`'s
  // `smiLimitFor` makes for its own SMI table.
  return byHouseholdSize[byHouseholdSize.length - 1]!;
}
