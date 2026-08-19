import { inForceOn, type EffectiveDated } from "../effective-dated";
import { fplAnnual } from "../fpl";
import { monthlyTotal, needsWorkHours } from "../income";
import { statusDependent } from "../immigration-status";
import type { ProgramRule } from "../program-rule";
import type { FactId, HouseholdProfile, Member, Money, ProgramId } from "../types";

export const CEAP: ProgramId = "ceap";

/**
 * The Programs whose receipt makes a household categorically income-eligible
 * for CEAP — no income test, no asset test, and (per DSS) the first four are
 * auto-verified by a state data match rather than re-proven on the CEAP
 * application. This is the case that carries the product's thesis in the
 * government's own words: a household already on SNAP does not prove its
 * income twice.
 *
 * `docs/ct-program-facts.md` §4, sourced to the FFY2026 LIHEAP-CEAP fact
 * sheet: "Categorically income-eligible if the household receives SNAP, TFA,
 * Refugee Cash Assistance, State Supplement, or SSI."
 */
const CATEGORICALLY_ELIGIBLE_PROGRAMS: ProgramId[] = [
  "snap",
  "tfa",
  "refugee-cash-assistance",
  "state-supplement",
  "ssi",
];

type CeapLevel = {
  vulnerableAnnual: Money;
  nonVulnerableAnnual: Money;
  rentalAssistanceAnnual: Money;
};

type CeapFigures = {
  /** How the season is named wherever a figure derived from this row is quoted. */
  basis: string;
  /** Set only on a row the issuing agency itself has not finalised (ADR-0010: a caveat a surface can act on, not prose it has to parse). */
  provisional?: boolean;
  /** Index 0 = Level 1 (at or below 125% FPL) through index 2 = Level 3 (201% FPL – 60% SMI). */
  levels: [CeapLevel, CeapLevel, CeapLevel];
  /** The eligibility ceiling itself: 60% of State Median Income, annual, by household size. */
  smiLimitByHouseholdSize: Money[];
};

/**
 * CEAP's benefit matrix and SMI eligibility ceiling, by season.
 *
 * **Do not cite the DSS "Winter Heating — Benefits" page** — per
 * `docs/ct-program-facts.md` §4 it conflicts with both the FFY2026 fact sheet
 * and the FFY2027 allocation plan and appears stale. Every figure below comes
 * from one of those two documents instead.
 *
 * The 2025-26 season (FFY2026) is final; the 2026-27 season (FFY2027) is
 * **proposed** — the public hearing was held 2026-08-12, two days before this
 * research, and the plan itself says DSS may adjust if the final federal
 * award differs. `provisional: true` carries that fact to every figure this
 * row produces, so a surface can badge or caveat it without re-deriving
 * meaning from a caption (ADR-0010).
 *
 * Crisis assistance (up to three per-delivery payments, deliverable-fuel
 * households only) is deliberately not modelled: it depends on fuel type and
 * delivery count, neither of which the conversation asks about, and CEAP's
 * basic-plus-rental figure is defensible without it.
 */
const CEAP_TABLES: EffectiveDated<CeapFigures>[] = [
  {
    effectiveFrom: "2025-10-01",
    effectiveTo: "2026-09-30",
    value: {
      basis: "2025-26 heating season (FFY2026 LIHEAP-CEAP), October 2025 – September 2026",
      levels: [
        { vulnerableAnnual: 64_500, nonVulnerableAnnual: 59_500, rentalAssistanceAnnual: 12_500 },
        { vulnerableAnnual: 49_500, nonVulnerableAnnual: 44_500, rentalAssistanceAnnual: 10_000 },
        { vulnerableAnnual: 34_500, nonVulnerableAnnual: 29_500, rentalAssistanceAnnual: 7_500 },
      ],
      smiLimitByHouseholdSize: [
        4_776_400, 6_246_000, 7_715_700, 9_185_400, 10_655_000, 12_124_700, 12_400_200, 12_675_800,
      ],
    },
  },
  {
    effectiveFrom: "2026-10-01",
    effectiveTo: "2027-09-30",
    value: {
      basis: "2026-27 heating season (FFY2027 LIHEAP allocation plan) — proposed, not final",
      provisional: true,
      levels: [
        { vulnerableAnnual: 70_500, nonVulnerableAnnual: 65_500, rentalAssistanceAnnual: 14_000 },
        { vulnerableAnnual: 55_500, nonVulnerableAnnual: 50_500, rentalAssistanceAnnual: 11_500 },
        { vulnerableAnnual: 40_500, nonVulnerableAnnual: 35_500, rentalAssistanceAnnual: 9_000 },
      ],
      smiLimitByHouseholdSize: [
        4_871_400, 6_370_300, 7_869_200, 9_368_100, 10_866_900, 12_365_800, 12_646_900, 12_927_900,
      ],
    },
  },
];

/**
 * CEAP is status-dependent with SNAP's exact shape (`docs/ct-program-facts.md`
 * §8, citing the FFY2027 allocation plan §V.J–K): a non-qualified alien is
 * dropped from the counted household but their income still counts. This
 * implementation cannot evaluate status per member (ADR-0004), so — exactly
 * like SNAP — the whole score passes through `statusDependent` rather than
 * branching inside `scoreCeap`.
 */
export const screenCeap: ProgramRule = (profile, asOf) =>
  statusDependent(scoreCeap(profile, asOf), profile.immigrationStatus);

/**
 * CEAP's screen. Unlike SNAP, there is no Program-unit question to ask: CEAP
 * prices a home's heat, not a food-sharing arrangement, so the unit is simply
 * every household member (there is one Household profile per dwelling).
 *
 * Eligibility reaches `likely-eligible` two ways, and the categorical one is
 * the point of this ticket: a household already receiving SNAP, TFA, Refugee
 * Cash Assistance, State Supplement, or SSI is income-eligible without an
 * income test at all (`CATEGORICALLY_ELIGIBLE_PROGRAMS`). Absent that, income
 * is tested against 60% of State Median Income, with **no asset test** either
 * way (`docs/ct-program-facts.md` §4).
 *
 * The figure is priced separately from the outcome, the same split SNAP uses
 * for rent and utilities: sizing CEAP's dollar amount needs the level band
 * (from income, regardless of *why* the household is eligible), whether
 * anyone in it is vulnerable, and whether it rents. A categorically-eligible
 * household can therefore appear on the map as likely-eligible before its
 * income is ever asked, with the figure arriving once it is — the map reading
 * as refinement, never as a guess.
 */
const scoreCeap: ProgramRule = (profile, asOf) => {
  const table = inForceOn(CEAP_TABLES, asOf);

  // No published figures cover `asOf`. Nothing the Resident could say would
  // change that, so this blocks no facts — CEAP is simply not on the map.
  if (!table) return { programId: CEAP, blockedBy: [] };

  // The opening of a conversation: nobody exists yet to test income for or to
  // price a figure for.
  if (profile.members.length === 0) {
    return { programId: CEAP, blockedBy: ["household-members", "income-sources"] };
  }

  const { members } = profile;
  const unit = members.map((member) => member.id);
  const sources = members.flatMap((member) => member.incomeSources ?? []);
  const categorical = isCategoricallyEligible(profile);

  // Two independent facts, exactly as SNAP tracks them (`programs/snap.ts`):
  // a member never asked for income is a different gap from an hourly rate
  // asked for but not yet convertible, and a household can have both at once.
  const incomeBlockedBy: FactId[] = [];
  if (members.some((member) => member.incomeSources === undefined)) incomeBlockedBy.push("income-sources");
  if (needsWorkHours(sources)) incomeBlockedBy.push("work-hours");

  if (!categorical) {
    // Not categorically eligible, so the outcome itself turns on income. A
    // Program with an unknown outcome is absent from the map entirely, not
    // present with a guess.
    if (incomeBlockedBy.length > 0) return { programId: CEAP, blockedBy: incomeBlockedBy };

    const annualIncome = (monthlyTotal(sources) ?? 0) * 12;
    if (annualIncome > smiLimitFor(table, members.length)) {
      return {
        programId: CEAP,
        blockedBy: [],
        result: { programId: CEAP, outcome: "likely-ineligible", unit, blockedBy: [] },
      };
    }
  }

  // Likely-eligible from here — by the income test just applied, or
  // categorically, without it. What is still missing from here on costs a
  // figure, not the outcome.
  const vulnerable = vulnerabilityOf(members);
  const figureBlockedBy: FactId[] = [
    ...incomeBlockedBy,
    ...(vulnerable === undefined ? (["disability"] as const) : []),
    ...(profile.monthlyRent === undefined ? (["rent"] as const) : []),
  ];

  if (figureBlockedBy.length > 0) {
    return {
      programId: CEAP,
      blockedBy: figureBlockedBy,
      result: { programId: CEAP, outcome: "likely-eligible", unit, blockedBy: figureBlockedBy },
    };
  }

  const annualIncome = (monthlyTotal(sources) ?? 0) * 12;
  const level = levelFor(table, annualIncome, members.length);
  const basic = vulnerable ? level.vulnerableAnnual : level.nonVulnerableAnnual;
  const rentalAssistance = profile.monthlyRent! > 0 ? level.rentalAssistanceAnnual : 0;

  return {
    programId: CEAP,
    blockedBy: [],
    result: {
      programId: CEAP,
      outcome: "likely-eligible",
      unit,
      figures: {
        annual: basic + rentalAssistance,
        basis: table.basis,
        ...(table.provisional ? { provisional: true as const } : {}),
      },
      blockedBy: [],
    },
  };
};

/**
 * Program receipt (`programsAlreadyReceived`), or an SSI income source. The
 * conversation already captures SSI as an income type (ADR-0009) — asking a
 * household receiving it "do you also get SSI?" a second time as a Program
 * would be the redundant question ADR-0002 exists to avoid.
 */
function isCategoricallyEligible(profile: HouseholdProfile): boolean {
  if (profile.programsAlreadyReceived?.some((program) => CATEGORICALLY_ELIGIBLE_PROGRAMS.includes(program))) {
    return true;
  }

  const { members } = profile;

  return members.some((member) => member.incomeSources?.some((source) => source.type === "ssi"));
}

/**
 * "Vulnerable" = a member aged 60+, a member with a disability, or a child
 * under age 6 (`docs/ct-program-facts.md` §4). `undefined` means the
 * household cannot yet be classified either way: nobody in it is vulnerable
 * by age, and at least one member's disability status has never been asked.
 * Age is checked first and short-circuits the question entirely for most
 * households — Maria's household never needs to answer it, because her
 * four-year-old already settles it.
 */
function vulnerabilityOf(members: Member[]): boolean | undefined {
  if (members.some((member) => member.age !== undefined && (member.age >= 60 || member.age < 6))) {
    return true;
  }

  if (members.some((member) => member.hasDisability === true)) return true;
  if (members.some((member) => member.hasDisability === undefined)) return undefined;

  return false;
}

function smiLimitFor(table: CeapFigures, householdSize: number): Money {
  const tabulated = table.smiLimitByHouseholdSize[householdSize - 1];
  if (tabulated !== undefined) return tabulated;

  // The SMI table's source gives no per-additional-member increment (unlike
  // the FPL table below), so a household larger than the tabulated eight
  // holds at the size-eight ceiling rather than an invented one. Conservative
  // in the direction of a lower eligibility ceiling, and named so a reader
  // does not go looking for a ninth row.
  return table.smiLimitByHouseholdSize[table.smiLimitByHouseholdSize.length - 1]!;
}

/**
 * Which of the three bands `annualIncome` falls in. Only the two lower edges
 * (125%, 200% FPL) are computed here — the upper edge of Level 3 is the SMI
 * ceiling already applied by `scoreCeap`, so anything past 200% FPL that
 * reached this function is Level 3 by construction.
 */
function levelFor(table: CeapFigures, annualIncome: Money, householdSize: number): CeapLevel {
  const fpl = fplAnnual(householdSize);

  if (annualIncome <= Math.round(fpl * 1.25)) return table.levels[0];
  if (annualIncome <= fpl * 2) return table.levels[1];
  return table.levels[2];
}
