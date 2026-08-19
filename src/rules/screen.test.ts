import { describe, expect, it } from "vitest";
import {
  ceapCategoricalHousehold,
  ctBbceBoundaryHousehold,
  declinedStatusHousehold,
  deniseAlone,
  deniseWithHerSon,
  mariaBeforeHerMother,
} from "./fixtures";
import { screen } from "./screen";
import { emptyHouseholdProfile, type HouseholdProfile, type Member } from "./types";

/**
 * Per the spec, tests assert on the whole `ScreeningResult` for a given
 * Household profile and `asOf`. They never reach inside `screen` — the
 * decomposition behind the seam is expected to change (ADR-0011).
 */

/** Inside FY2026, the only period SNAP figures are published for. */
const ASOF = "2026-08-15";

/**
 * Connecticut's SNAP gross income limit, 200% FPL under broad-based
 * categorical eligibility, FY2026 monthly. Restated here so a test that starts
 * passing for the wrong reason is visible against the numbers rather than
 * against whatever the module now believes.
 */
const CT_LIMIT_HH3 = 444_200;
/** The federal 130% gross test for a household of three — the rule CT does *not* apply. */
const FEDERAL_LIMIT_HH3 = 288_800;

const householdOfThree = (monthlyIncome: number): HouseholdProfile => ({
  members: [
    member("self", { incomeSources: [{ type: "wages", amount: monthlyIncome, period: "monthly" }] }),
    member("child-1"),
    member("child-2"),
  ],
});

function member(id: string, overrides: Partial<Member> = {}): Member {
  return { id, sharesFoodPurchaseAndPreparation: true, incomeSources: [], ...overrides };
}

/** Just the names, for assertions about what is and is not still being asked. */
function blockingFactIds(profile: HouseholdProfile, asOf = ASOF): string[] {
  return screen(profile, asOf, 0).blockingFacts.map((fact) => fact.factId);
}

/** Just which Programs are on the map, for assertions about presence rather than figures. */
function programIds(profile: HouseholdProfile, asOf = ASOF): string[] {
  return screen(profile, asOf, 0).programs.map((program) => program.programId);
}

describe("screen", () => {
  it("returns an empty eligibility map for an empty Household profile", () => {
    expect(screen(emptyHouseholdProfile(), ASOF, 0)).toEqual({
      asOf: ASOF,
      sequence: 0,
      programs: [],
      keychain: [],
      headlineAnnualTotal: 0,
      // Nothing is known, so every fact each Program needs is missing. Ranked
      // by how many Programs each blocks: `household-members` blocks all
      // five — even HUSKY A/D and Care 4 Kids, which do not yet know whether
      // this household has anyone they cover — and outranks `income-sources`,
      // which blocks only SNAP and CEAP: HUSKY A/D and Care 4 Kids do not
      // apply to every household the way CEAP does, so they wait for a
      // member's age (or pregnancy, or a working parent) before asking for
      // income on their own account at all — exactly ADR-0002's promise that
      // a new Program starts pulling on the conversation with no prompt
      // change, without forcing every Program to ask for everything.
      blockingFacts: [
        { factId: "household-members", blocks: ["snap", "ceap", "husky-a", "husky-d", "care-4-kids"] },
        { factId: "income-sources", blocks: ["snap", "ceap"] },
        { factId: "food-sharing", blocks: ["snap"] },
      ],
    });
  });

  it("reads its date from asOf rather than the clock", () => {
    expect(screen(emptyHouseholdProfile(), "2025-01-01", 0).asOf).toBe("2025-01-01");
    expect(screen(emptyHouseholdProfile(), "2027-10-01", 0).asOf).toBe("2027-10-01");
  });

  it("carries the sequence it was given, so earlier maps can be marked superseded", () => {
    expect(screen(emptyHouseholdProfile(), ASOF, 4).sequence).toBe(4);
  });

  it("does not mutate the Household profile it is given", () => {
    const profile = structuredClone(ctBbceBoundaryHousehold);
    screen(profile, ASOF, 0);
    expect(profile).toEqual(ctBbceBoundaryHousehold);
  });
});

describe("SNAP under Connecticut's broad-based categorical eligibility", () => {
  /**
   * The single most important regression in the suite. A screener built on the
   * federal 130% gross test wrongly turns this household away; in Connecticut
   * 130% is only the threshold at which a household must *report* an income
   * change, and the gate is 200% FPL.
   */
  it("screens a household above the federal 130% test and below CT's 200% as likely-eligible", () => {
    expect(screen(ctBbceBoundaryHousehold, ASOF, 1)).toEqual({
      asOf: ASOF,
      sequence: 1,
      programs: [
        {
          programId: "snap",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          // This fixture has never said which utilities it pays, so the
          // outcome is settled and the figure is not — tier 2, and the fact
          // that would move it to tier 1 named on the entry.
          blockedBy: ["utility-costs"],
        },
        // CEAP does not need to know which utilities are paid — only rent,
        // which this fixture carries — so it reaches tier 1 in the same turn
        // SNAP is still waiting on utility-costs. $43,280.04/year is between
        // 125% FPL ($34,150) and 200% FPL ($54,640) for a household of three:
        // Level 2. The four-year-old makes the household vulnerable, so the
        // figure is $495 basic + $100 rental assistance.
        {
          programId: "ceap",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: {
            annual: 59_500,
            basis: "2025-26 heating season (FFY2026 LIHEAP-CEAP), October 2025 – September 2026",
          },
          blockedBy: [],
        },
        // HUSKY A's 138% parent/caretaker line for a household of three is
        // $3,142/month; this household's ~$3,606.68 clears it, so the self
        // does not join the unit. Its own 201% children's line is
        // $4,577/month — well clear — so both children do, and coverage is
        // never a figure regardless.
        {
          programId: "husky-a",
          outcome: "likely-eligible",
          unit: ["child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
        // Care 4 Kids' income ceiling (60% SMI, $77,157 for three) clears by a
        // wide margin, both children are under 13, and the self has wages —
        // a working parent. Waitlisted, not a figure, and neither child
        // contributes to the headline.
        {
          programId: "care-4-kids",
          outcome: "likely-eligible",
          unit: ["child-1", "child-2"],
          noFigureReason: "waitlisted",
          waitlist: { typicalWaitMonths: 8, invitingApplicationsReceivedBy: "2025-09-15" },
          blockedBy: [],
        },
      ],
      keychain: [],
      // SNAP has no defensible figure yet, so CEAP's is the whole headline.
      headlineAnnualTotal: 59_500,
      blockingFacts: [{ factId: "utility-costs", blocks: ["snap"] }],
    });
  });

  it("does not gate on the federal 130% test", () => {
    // A household a dollar over the federal limit is nowhere near CT's, and
    // CT's is the one that decides. This is the assertion the fixture above
    // exists in the world to illustrate.
    expect(screen(householdOfThree(FEDERAL_LIMIT_HH3 + 100), ASOF, 0).programs[0]!.outcome).toBe(
      "likely-eligible",
    );
  });

  it("screens at the limit, not below it", () => {
    expect(screen(householdOfThree(CT_LIMIT_HH3), ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
    expect(screen(householdOfThree(CT_LIMIT_HH3 + 1), ASOF, 0).programs[0]!.outcome).toBe(
      "likely-ineligible",
    );
  });

  it("counts income however the Resident is paid, without the conversation converting it", () => {
    // A one-person unit is limited to $2,609 a month. Each of these is the
    // same wage said a different way, and the pair straddles that line — which
    // it only can if the period conversion is right to the cent.
    const paid = (amount: number, period: "weekly" | "biweekly" | "annual"): HouseholdProfile => ({
      members: [{ id: "self", incomeSources: [{ type: "wages", amount, period }] }],
    });

    // $602 a week is $2,608.67 a month; $603 is $2,613.
    expect(screen(paid(60_200, "weekly"), ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
    expect(screen(paid(60_300, "weekly"), ASOF, 0).programs[0]!.outcome).toBe("likely-ineligible");
    expect(screen(paid(120_400, "biweekly"), ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
    expect(screen(paid(3_130_000, "annual"), ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
    expect(screen(paid(3_140_000, "annual"), ASOF, 0).programs[0]!.outcome).toBe("likely-ineligible");
  });

  it("extends the limit table past the eight sizes the agency tabulates", () => {
    const nine: HouseholdProfile = {
      members: [
        member("self", { incomeSources: [{ type: "wages", amount: 994_200, period: "monthly" }] }),
        ...Array.from({ length: 8 }, (_, index) => member(`child-${index}`)),
      ],
    };

    // $9,025 for eight, plus $917 for the ninth.
    expect(screen(nine, ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
  });
});

describe("the SNAP Program unit", () => {
  const grandmother = member("grandmother", {
    age: 67,
    sharesFoodPurchaseAndPreparation: false,
    incomeSources: [{ type: "social-security", amount: 180_000, period: "monthly" }],
  });

  const household: HouseholdProfile = {
    members: [
      member("self", { incomeSources: [{ type: "wages", amount: 400_000, period: "monthly" }] }),
      member("child-1"),
      grandmother,
    ],
  };

  it("counts only the people who purchase and prepare food together", () => {
    // Every Program derives its own unit (ADR-0003). The grandmother is
    // outside this one; a later Program will count her.
    expect(screen(household, ASOF, 0).programs[0]!.unit).toEqual(["self", "child-1"]);
  });

  it("leaves income belonging to members outside the unit out of the test", () => {
    // $4,000 against a two-person limit of $3,525 is over; with her $1,800
    // Social Security wrongly added it would be over a three-person limit too,
    // so the assertion that carries the point is the unit's own boundary.
    expect(screen(household, ASOF, 0).programs[0]!.outcome).toBe("likely-ineligible");

    const withinLimit: HouseholdProfile = {
      members: [
        member("self", { incomeSources: [{ type: "wages", amount: 300_000, period: "monthly" }] }),
        member("child-1"),
        grandmother,
      ],
    };

    // $3,000 is under the two-person limit of $3,525, but $3,000 + her $1,800
    // would be over the three-person limit of $4,442. Counting her would flip
    // this household off the map.
    expect(screen(withinLimit, ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
  });

  it("does not ask a household of one who they buy and prepare food with", () => {
    const alone: HouseholdProfile = {
      members: [{ id: "self", incomeSources: [{ type: "wages", amount: 200_000, period: "monthly" }] }],
    };

    expect(blockingFactIds(alone)).not.toContain("food-sharing");
    expect(screen(alone, ASOF, 0).programs[0]!.unit).toEqual(["self"]);
  });
});

describe("Blocking facts", () => {
  it("asks what anyone earns before who eats together, once a second Program wants it too", () => {
    // With only SNAP screening, food-sharing would come first — it is the
    // fact SNAP needs before it can even ask about income. CEAP has no
    // food-sharing concept of its own and wants income straight away, so once
    // it is in the mix `income-sources` blocks two Programs to food-sharing's
    // one and outranks it. Nothing about SNAP changed; CEAP landing is what
    // moved this (ADR-0002).
    const profile: HouseholdProfile = {
      members: [{ id: "self" }, { id: "mother" }],
    };

    expect(screen(profile, ASOF, 0).blockingFacts).toEqual([
      { factId: "income-sources", blocks: ["snap", "ceap"] },
      { factId: "food-sharing", blocks: ["snap"] },
    ]);
  });

  it("distinguishes a member with no income from a member nobody has asked", () => {
    const unasked: HouseholdProfile = { members: [{ id: "self", sharesFoodPurchaseAndPreparation: true }] };
    const asked: HouseholdProfile = { members: [member("self")] };

    expect(screen(unasked, ASOF, 0).blockingFacts).toEqual([
      { factId: "income-sources", blocks: ["snap", "ceap"] },
    ]);
    // The asked household is scored; what it is still missing is the shelter
    // costs that price the allotment, never income.
    expect(blockingFactIds(asked)).not.toContain("income-sources");
    expect(screen(asked, ASOF, 0).programs[0]!.outcome).toBe("likely-eligible");
  });

  it("asks how many hours an hourly rate is worked, rather than assuming full time", () => {
    const profile: HouseholdProfile = {
      members: [member("self", { incomeSources: [{ type: "wages", amount: 2_500, period: "hourly" }] })],
    };

    const result = screen(profile, ASOF, 0);
    expect(result.blockingFacts).toEqual([{ factId: "work-hours", blocks: ["snap", "ceap"] }]);
    // Blocked means absent from the map, never present with a guess.
    expect(result.programs).toEqual([]);
  });

  it("stops reporting a fact once the conversation has produced it", () => {
    // Maria's profile carries everything SNAP asks for, outcome and figure
    // alike, so there is nothing left for Elicitation to put on its agenda.
    expect(screen(mariaBeforeHerMother, ASOF, 0).blockingFacts).toEqual([]);
  });

  it("keeps asking for rent and utilities even though SNAP is already scored", () => {
    // The facts that only cost a figure still have to reach Elicitation's
    // agenda, or nobody goes and gets them and the figure never arrives
    // (ADR-0002). `rankBlockingFacts` reads the screening, not the entry on
    // the map, which is what makes that work.
    const { utilitiesPaid, monthlyRent, ...withoutShelterCosts } = mariaBeforeHerMother;

    expect(screen(withoutShelterCosts, ASOF, 0).blockingFacts).toEqual([
      // CEAP wants rent too — it decides the rental-assistance component —
      // but has no interest in which utilities are paid.
      { factId: "rent", blocks: ["snap", "ceap"] },
      { factId: "utility-costs", blocks: ["snap"] },
    ]);
  });

  it("does not ask a SNAP-ineligible household what it pays in rent, but still asks for CEAP", () => {
    // SNAP and CEAP do not share a ceiling: SNAP's is 200% FPL, CEAP's is 60%
    // of State Median Income — for a household of three, $65,304/year is over
    // the first ($53,304 — CT_LIMIT_HH3's annualized figure) and well under
    // the second ($77,157). Each Program derives its own applicability
    // (ADR-0003): SNAP is never asked for a rent figure it cannot use, and
    // CEAP — still on the map — is.
    const overLimit = householdOfThree(CT_LIMIT_HH3 + 100_000);
    const result = screen(overLimit, ASOF, 0);

    const snap = result.programs.find((program) => program.programId === "snap")!;
    expect(snap.outcome).toBe("likely-ineligible");
    expect(snap.blockedBy).toEqual([]);

    const ceap = result.programs.find((program) => program.programId === "ceap")!;
    expect(ceap.outcome).toBe("likely-eligible");
    expect(ceap.blockedBy).toEqual(["disability", "rent"]);

    // Ranked by how many Programs each blocks; tied at one apiece, ASK_ORDER
    // breaks the tie — rent before disability.
    expect(result.blockingFacts).toEqual([
      { factId: "rent", blocks: ["ceap"] },
      { factId: "disability", blocks: ["ceap"] },
    ]);
  });
});

describe("the SNAP monthly allotment", () => {
  /**
   * Maria before her mother, computed end to end. Every step is written out so
   * a reader can check the figure by hand against the FY2026 tables rather than
   * against whatever the module currently believes.
   *
   *   gross monthly income      $18.00/hr × 24 hrs × 52/12   = $1,872.00
   *                             + $200.00 cash               = $2,072.00
   *   earned income deduction   20% of $2,072.00             =   $414.40
   *   standard deduction        unit of 3                    =   $209.00
   *   adjusted income           $2,072.00 − $414.40 − $209.00 = $1,448.60
   *   half of adjusted income                                =   $724.30
   *   shelter costs             $1,600.00 rent + $976.00 SUA = $2,576.00
   *   excess shelter            $2,576.00 − $724.30          = $1,851.70
   *   excess shelter, capped    cap is $744.00               =   $744.00
   *   net monthly income        $1,448.60 − $744.00          =   $704.60
   *   30% of net, rounded up    $211.38 → next whole dollar  =   $212.00
   *   maximum allotment         unit of 3                    =   $785.00
   *   monthly allotment         $785.00 − $212.00            =   $573.00
   *   annual                    $573.00 × 12                 = $6,876.00
   */
  it("computes the whole chain for Maria before her mother", () => {
    expect(screen(mariaBeforeHerMother, ASOF, 1)).toEqual({
      asOf: ASOF,
      sequence: 1,
      programs: [
        {
          programId: "snap",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: {
            monthly: 57_300,
            annual: 687_600,
            basis: "FY2026 figures (October 2025 – September 2026)",
          },
          blockedBy: [],
        },
        // $24,864/year is at or below 125% FPL for a household of three
        // ($34,150): Level 1. Her four-year-old makes the household
        // vulnerable, and she rents, so the figure is $645 basic + $125
        // rental assistance.
        {
          programId: "ceap",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: {
            annual: 77_000,
            basis: "2025-26 heating season (FFY2026 LIHEAP-CEAP), October 2025 – September 2026",
          },
          blockedBy: [],
        },
        // $2,072/month is under HUSKY A's 138% parent line for a household of
        // three ($3,142), so Maria joins the unit alongside her children —
        // unlike the CT BBCE boundary household above her, whose income
        // clears the parent line but not the children's.
        {
          programId: "husky-a",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
        // Both children are under 13, Maria's wages make her a working
        // parent, and $24,864/year is well under the 60% SMI ceiling
        // ($77,157 for three) — waitlisted, never a figure.
        {
          programId: "care-4-kids",
          outcome: "likely-eligible",
          unit: ["child-1", "child-2"],
          noFigureReason: "waitlisted",
          waitlist: { typicalWaitMonths: 8, invitingApplicationsReceivedBy: "2025-09-15" },
          blockedBy: [],
        },
      ],
      keychain: [],
      // The first tier-1 figures, and therefore the first headline that is not
      // zero. HUSKY A and Care 4 Kids never carry a figure, so neither moves
      // it — every derived form here is still what SNAP and CEAP contribute
      // (ADR-0010).
      headlineAnnualTotal: 764_600,
      blockingFacts: [],
      // Nothing is left to ask, so the one optional question opens — and only
      // now, so it never competes with the ranked list (ADR-0002, ADR-0004).
      // CEAP, HUSKY A and Care 4 Kids all carry the same status shape as SNAP
      // (`docs/ct-program-facts.md` §8), so each joins the question the
      // moment it too has nothing left on the Blocking facts list.
      statusQuestion: { blocks: ["snap", "ceap", "husky-a", "care-4-kids"] },
    });
  });

  it("moves SNAP from tier 2 to tier 1 as the shelter facts land", () => {
    // The refinement the panel is meant to read as. Nothing about the outcome
    // changes across these three maps; what changes is how much BenefitBridge
    // can say the household is owed.
    const { utilitiesPaid, monthlyRent, ...nothingKnownYet } = mariaBeforeHerMother;
    const withRent = { ...nothingKnownYet, monthlyRent };

    const tierTwo = screen(nothingKnownYet, ASOF, 1).programs[0]!;
    expect(tierTwo.outcome).toBe("likely-eligible");
    expect(tierTwo.figures).toBeUndefined();
    expect(tierTwo.blockedBy).toEqual(["rent", "utility-costs"]);

    // Rent alone is not enough: the utility allowance is part of shelter costs,
    // and in Connecticut it is usually the larger half of them.
    const stillTierTwo = screen(withRent, ASOF, 2).programs[0]!;
    expect(stillTierTwo.figures).toBeUndefined();
    expect(stillTierTwo.blockedBy).toEqual(["utility-costs"]);

    const tierOne = screen(mariaBeforeHerMother, ASOF, 3);
    expect(tierOne.programs[0]!.figures!.annual).toBe(687_600);
    expect(tierOne.programs[0]!.blockedBy).toEqual([]);
    // CEAP's own figure ($770) is on the map by now too, so the headline is
    // SNAP's and CEAP's together.
    expect(tierOne.headlineAnnualTotal).toBe(764_600);
  });

  it("gives a household whose rent covers everything no utility allowance", () => {
    // `[]` is "asked, and the rent covers it" and produces a figure; the same
    // field left absent is "nobody has asked" and produces none.
    const rentIncludesUtilities = { ...mariaBeforeHerMother, utilitiesPaid: [] };

    // Shelter costs are $1,600.00 with no allowance; excess shelter is
    // $1,600.00 − $724.30 = $875.70, still over the $744.00 cap, so net income
    // and the allotment are unchanged. The cap is doing the work here, which is
    // exactly why lifting it for an elderly member (issue #17) matters.
    expect(screen(rentIncludesUtilities, ASOF, 0).programs[0]!.figures!.monthly).toBe(57_300);
  });

  it("takes the Standard Utility Allowance for a household that pays for heat", () => {
    // Connecticut is a mandatory-SUA state, so a heating cost settles it and
    // the household's actual bills never enter the calculation. Compared
    // against a household paying only for a phone, where the allowance is $36
    // and shelter costs fall below the cap.
    const phoneOnly = { ...mariaBeforeHerMother, monthlyRent: 90_000, utilitiesPaid: ["phone" as const] };

    // Shelter costs $900.00 + $36.00 = $936.00; excess $936.00 − $724.30 =
    // $211.70, under the $744.00 cap; net income $1,448.60 − $211.70 =
    // $1,236.90; 30% is $371.07, rounded up to $372.00; $785.00 − $372.00.
    expect(screen(phoneOnly, ASOF, 0).programs[0]!.figures!.monthly).toBe(41_300);

    const twoOtherUtilities = {
      ...phoneOnly,
      utilitiesPaid: ["electricity" as const, "water" as const],
    };

    // The Limited allowance is $430.00: shelter costs $1,330.00, excess
    // $605.70, still under the cap; net $842.90; 30% is $252.87 → $253.00.
    expect(screen(twoOtherUtilities, ASOF, 0).programs[0]!.figures!.monthly).toBe(53_200);
  });

  it("counts internet toward no utility allowance at all", () => {
    // OBBBA §10104 bars internet fees from the shelter deduction, so internet
    // plus one other utility is one qualifying utility, not two — the Limited
    // allowance is out of reach and the household gets nothing.
    const internetAndElectricity = {
      ...mariaBeforeHerMother,
      monthlyRent: 90_000,
      utilitiesPaid: ["internet" as const, "electricity" as const],
    };

    // Shelter costs $900.00 with no allowance; excess $175.70; net $1,272.90;
    // 30% is $381.87 → $382.00; $785.00 − $382.00.
    expect(screen(internetAndElectricity, ASOF, 0).programs[0]!.figures!.monthly).toBe(40_300);
  });

  it("applies the 20% deduction to earned income and withholds it from unearned", () => {
    // The same $2,072.00 a month, arriving as Social Security instead of as
    // wages. No earned income deduction, so adjusted income is $1,863.00, half
    // is $931.50, excess shelter is still over the cap, net is $1,119.00, 30%
    // is $335.70 → $336.00, and the allotment is $785.00 − $336.00.
    const unearned: HouseholdProfile = {
      ...mariaBeforeHerMother,
      members: [
        member("self", {
          incomeSources: [{ type: "social-security", amount: 207_200, period: "monthly" }],
        }),
        member("child-1", { age: 9 }),
        member("child-2", { age: 4 }),
      ],
    };

    expect(screen(unearned, ASOF, 0).programs[0]!.figures!.monthly).toBe(44_900);
  });

  it("pays a one-person household the $24 minimum rather than nothing", () => {
    // $2,600.00 a month is inside CT's $2,609.00 limit for a unit of one and
    // computes to a negative allotment: adjusted income $1,871.00, half
    // $935.50, shelter costs $600.00, so no shelter deduction at all; 30% of
    // $1,871.00 is $561.30 → $562.00 against a $298.00 maximum.
    const alone: HouseholdProfile = {
      members: [member("self", { incomeSources: [{ type: "wages", amount: 260_000, period: "monthly" }] })],
      monthlyRent: 60_000,
      utilitiesPaid: [],
    };

    expect(screen(alone, ASOF, 0).programs[0]!.figures).toEqual({
      monthly: 2_400,
      annual: 28_800,
      basis: "FY2026 figures (October 2025 – September 2026)",
    });
  });

  it("leaves a larger household that computes to zero off the map rather than at $0", () => {
    // The minimum allotment reaches one- and two-person units only. A unit of
    // three with income near CT's limit and no shelter costs computes to
    // nothing, and nothing is not a figure worth a tier-1 line.
    const zero: HouseholdProfile = {
      ...householdOfThree(CT_LIMIT_HH3),
      monthlyRent: 0,
      utilitiesPaid: [],
    };

    expect(screen(zero, ASOF, 0).programs[0]!.outcome).toBe("likely-ineligible");
    expect(screen(zero, ASOF, 0).programs[0]!.figures).toBeUndefined();
    expect(screen(zero, ASOF, 0).headlineAnnualTotal).toBe(0);
  });

  it("rounds 30% of net income up to the next whole dollar, as Connecticut elects to", () => {
    // 7 CFR 273.10(e)(2)(ii)(A) offers two elections and CT takes the round-up.
    // Maria's 30% is $211.38; rounded up it is $212.00 and her allotment is
    // $573.00. Under the other election — no rounding, allotment rounded down —
    // it would be $785.00 − $211.38 = $573.62, floored to $573.00 as well. The
    // elections differ by at most a dollar, which is why this assertion is
    // about a cent-level figure and not a headline.
    const monthly = screen(mariaBeforeHerMother, ASOF, 0).programs[0]!.figures!.monthly!;

    expect(monthly).toBe(57_300);
    // The observable consequence of the round-up: the deduction is a whole
    // number of dollars, so an allotment drawn from a whole-dollar maximum is
    // one too. An implementation that skipped the rounding would put $573.62
    // on the map.
    expect(monthly % 100).toBe(0);
  });
});

describe("Indeterminate: the optional immigration status question", () => {
  /**
   * The figure pair, and the sharpest evidence available that the wiring works:
   * one household, one field, $6,876 a year of difference. It is also the
   * honest measure of what declining costs, which ADR-0004 (as amended)
   * records rather than softens.
   */
  it("scores a household nobody has asked, and cannot score the same household once it declines", () => {
    expect(screen(mariaBeforeHerMother, ASOF, 1).programs[0]!.figures!.annual).toBe(687_600);
    // SNAP's $6,876 plus CEAP's $770 — both status-dependent, both live once
    // nobody has been asked.
    expect(screen(mariaBeforeHerMother, ASOF, 1).headlineAnnualTotal).toBe(764_600);

    expect(screen(declinedStatusHousehold, ASOF, 1).programs[0]!.figures).toBeUndefined();
    expect(screen(declinedStatusHousehold, ASOF, 1).headlineAnnualTotal).toBe(0);
  });

  it("reports a status-dependent Program as indeterminate when the Resident declines", () => {
    expect(screen(declinedStatusHousehold, ASOF, 1)).toEqual({
      asOf: ASOF,
      sequence: 1,
      programs: [
        {
          programId: "snap",
          outcome: "indeterminate",
          // Reported as derived — who SNAP would count if everyone qualified.
          // Real SNAP would count fewer (7 CFR 273.11(c)(3)), which is only
          // defensible next to an outcome saying it cannot be scored.
          unit: ["self", "child-1", "child-2"],
          blockedBy: [],
        },
        // CEAP, HUSKY A and Care 4 Kids all carry the same status shape as
        // SNAP (`docs/ct-program-facts.md` §8) and pass through the same
        // `statusDependent` wrap, so a decline lands all three on
        // Indeterminate too. Care 4 Kids' unit is only the children — HUSKY
        // A's own unit here still reflects Maria too, since she independently
        // clears its 138% parent line.
        {
          programId: "ceap",
          outcome: "indeterminate",
          unit: ["self", "child-1", "child-2"],
          blockedBy: [],
        },
        {
          programId: "husky-a",
          outcome: "indeterminate",
          unit: ["self", "child-1", "child-2"],
          blockedBy: [],
        },
        {
          programId: "care-4-kids",
          outcome: "indeterminate",
          unit: ["child-1", "child-2"],
          blockedBy: [],
        },
      ],
      keychain: [],
      // `headlineTotal` sums likely-eligible entries only, so an entry
      // BenefitBridge cannot put either way cannot be counted as money owed.
      //
      // What this cannot assert, and must not fake: the ticket asks that
      // status-blind Programs still be scored and the headline still be
      // produced from them. SNAP, CEAP, HUSKY A and Care 4 Kids are the only
      // implemented Programs and all four are status-dependent, so $0 is the
      // correct headline here. The CT Elderly/Disabled Renters' Rebate is the
      // only genuinely status-blind Program on the list
      // (`docs/ct-program-facts.md` §8); it is issue #17, gated on issue #10,
      // and when it lands this assertion should carry a non-zero headline
      // alongside these Indeterminate entries.
      headlineAnnualTotal: 0,
      // A declined household is asked for nothing further. Rent and utilities
      // would only price an allotment BenefitBridge cannot say is owed.
      blockingFacts: [],
      // Answered — including answered with a refusal — closes the question for
      // good. Re-asking is the ADR-0004 violation.
    });
  });

  /**
   * The regression that matters most. A mixed-status household is **not** an
   * ineligible household: under 7 CFR 273.11(c)(3) the ineligible member is
   * dropped from the Program unit and their income is still counted, so the
   * citizen children remain eligible for a smaller allotment this coarse
   * implementation cannot compute. Unscorable, not ineligible — and an
   * implementation that "helpfully" screened them out would be telling a
   * Stamford family the opposite of the law.
   */
  it("reports a mixed-status household as indeterminate, never as likely-ineligible", () => {
    const mixed = { ...mariaBeforeHerMother, immigrationStatus: "mixed" as const };

    expect(screen(mixed, ASOF, 1)).toEqual({
      asOf: ASOF,
      sequence: 1,
      programs: [
        { programId: "snap", outcome: "indeterminate", unit: ["self", "child-1", "child-2"], blockedBy: [] },
        { programId: "ceap", outcome: "indeterminate", unit: ["self", "child-1", "child-2"], blockedBy: [] },
        { programId: "husky-a", outcome: "indeterminate", unit: ["self", "child-1", "child-2"], blockedBy: [] },
        { programId: "care-4-kids", outcome: "indeterminate", unit: ["child-1", "child-2"], blockedBy: [] },
      ],
      keychain: [],
      headlineAnnualTotal: 0,
      blockingFacts: [],
    });
  });

  it("scores a household that says everyone qualifies exactly as it scores an unasked one", () => {
    const answered = { ...mariaBeforeHerMother, immigrationStatus: "all-qualifying" as const };

    expect(screen(answered, ASOF, 1)).toEqual({
      asOf: ASOF,
      sequence: 1,
      programs: [
        {
          programId: "snap",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: {
            monthly: 57_300,
            annual: 687_600,
            basis: "FY2026 figures (October 2025 – September 2026)",
          },
          blockedBy: [],
        },
        {
          programId: "ceap",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: {
            annual: 77_000,
            basis: "2025-26 heating season (FFY2026 LIHEAP-CEAP), October 2025 – September 2026",
          },
          blockedBy: [],
        },
        {
          programId: "husky-a",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
        {
          programId: "care-4-kids",
          outcome: "likely-eligible",
          unit: ["child-1", "child-2"],
          noFigureReason: "waitlisted",
          waitlist: { typicalWaitMonths: 8, invitingApplicationsReceivedBy: "2025-09-15" },
          blockedBy: [],
        },
      ],
      keychain: [],
      headlineAnnualTotal: 764_600,
      blockingFacts: [],
      // The question is spent, so it is not offered again.
    });
  });

  it("offers the question only once nothing is left on the Blocking facts list", () => {
    // Mid-conversation: SNAP is scored but the utilities that price it are not
    // known. The ranked list is the agenda and the optional question waits, so
    // the two never compete (ADR-0002).
    const { utilitiesPaid, ...midConversation } = mariaBeforeHerMother;

    expect(screen(midConversation, ASOF, 0).blockingFacts).toEqual([
      { factId: "utility-costs", blocks: ["snap"] },
    ]);
    expect(screen(midConversation, ASOF, 0).statusQuestion).toBeUndefined();

    expect(screen(mariaBeforeHerMother, ASOF, 0).statusQuestion).toEqual({
      blocks: ["snap", "ceap", "husky-a", "care-4-kids"],
    });
  });

  it("closes the question once any answer is recorded, a decline included", () => {
    for (const immigrationStatus of ["declined", "all-qualifying", "mixed"] as const) {
      expect(screen({ ...mariaBeforeHerMother, immigrationStatus }, ASOF, 0).statusQuestion).toBeUndefined();
    }
  });

  it("does not put the question to a household no answer could help", () => {
    // High enough to clear SNAP's 200% FPL limit *and* CEAP's 60% SMI ceiling
    // for a household of three ($77,157/year), so neither Program's outcome
    // would move whatever the answer says: status can only shrink a Program
    // unit while the dropped member's income is still counted
    // (7 CFR 273.11(c)(3)), which is strictly harsher than either test just
    // applied. Asking anyway would be a question that buys the Resident
    // nothing — the same reason a likely-ineligible household is never asked
    // what it pays in rent.
    const overBothLimits = {
      ...householdOfThree(CT_LIMIT_HH3 + 300_000),
      monthlyRent: 160_000,
      utilitiesPaid: ["heat" as const],
    };

    const result = screen(overBothLimits, ASOF, 0);
    expect(result.programs.map((program) => program.outcome)).toEqual([
      "likely-ineligible",
      "likely-ineligible",
    ]);
    expect(result.statusQuestion).toBeUndefined();
  });

  it("leaves Elicitation's agenda untouched, because status is not a Blocking fact", () => {
    // `facts.ts` does not change and must not: a declined status never arrives,
    // so on the ranked list it would pin itself to the top and be re-asked
    // every turn (CONTEXT.md, *Blocking fact*; ADR-0004).
    const opening: HouseholdProfile = { members: [] };

    expect(blockingFactIds(opening)).toEqual([
      "household-members",
      "income-sources",
      "food-sharing",
    ]);
    expect(blockingFactIds({ ...opening, immigrationStatus: "declined" })).toEqual([
      "household-members",
      "income-sources",
      "food-sharing",
    ]);
  });
});

describe("effective-dated figures", () => {
  it("screens SNAP inside the period its figures are published for", () => {
    expect(programIds(ctBbceBoundaryHousehold, "2025-10-01")).toContain("snap");
    expect(programIds(ctBbceBoundaryHousehold, "2026-09-30")).toContain("snap");
  });

  it("leaves SNAP off the map once its FY2026 figures expire — even though CEAP's own table still covers the date", () => {
    // FY2027 SNAP figures land on 2026-10-01 and USDA had not published them
    // when this table was written. A Program with no figures in force is one
    // BenefitBridge cannot screen — not one it screens with last year's
    // numbers. CEAP is the demonstration that this is genuinely per-Program:
    // its own FFY2027 table (proposed) already covers 2026-10-01, and HUSKY
    // A's own table has no confirmed end date (`programs/husky.ts`) so it is
    // still in force too — the map is CEAP and HUSKY A rather than empty
    // (CONTEXT.md, *Effective-dated figures*). Care 4 Kids' table ends with
    // CEAP's FFY2026 season and has no FFY2027 successor sourced, so it drops
    // off here rather than guessing one.
    expect(programIds(ctBbceBoundaryHousehold, "2026-10-01")).toEqual(["ceap", "husky-a"]);
    // Before either table starts, neither Program is on the map.
    expect(programIds(ctBbceBoundaryHousehold, "2025-09-30")).toEqual([]);
  });

  it("carries no SNAP allotment figure outside the FY2026 window", () => {
    // Maria's household is unchanged and fully known; only the date moved. The
    // figure goes with the tables it was computed from rather than surviving
    // them, and the headline goes with it.
    expect(screen(mariaBeforeHerMother, "2026-09-30", 0).programs[0]!.figures!.monthly).toBe(57_300);

    // CEAP's FFY2027 table has already begun (proposed) and HUSKY A's table
    // is still open, where SNAP's FY2026 one just ended and Care 4 Kids'
    // FFY2026 window has closed — the map holds CEAP's figure and HUSKY A's
    // coverage rather than nothing.
    const dayAfter = screen(mariaBeforeHerMother, "2026-10-01", 0);
    expect(programIds(mariaBeforeHerMother, "2026-10-01")).toEqual(["ceap", "husky-a"]);
    expect(dayAfter.headlineAnnualTotal).toBe(84_500);

    expect(screen(mariaBeforeHerMother, "2025-09-30", 0).programs).toEqual([]);
  });

  it("reports no Blocking facts when no table covers the date at all", () => {
    // Nothing the Resident could say would unblock either Program, so neither
    // must put a question into the conversation. Before 2025-10-01 is the one
    // date left where that is true for both SNAP and CEAP at once.
    expect(screen(emptyHouseholdProfile(), "2025-09-30", 0).blockingFacts).toEqual([]);
  });
});

describe("CEAP energy assistance", () => {
  /**
   * The case that proves the product's thesis in the government's own words
   * (issue #19; `docs/ct-program-facts.md` §4). Neither member's income has
   * ever been asked for — `incomeSources` is absent on both — and CEAP scores
   * `likely-eligible` anyway, from `programsAlreadyReceived: ["snap"]` alone.
   * SNAP itself gets no such shortcut: it stays off the map, still waiting on
   * facts CEAP no longer needs.
   */
  it("grants a SNAP household categorical income eligibility without an income test", () => {
    const result = screen(ceapCategoricalHousehold, ASOF, 0);

    expect(programIds(ceapCategoricalHousehold, ASOF)).toEqual(["ceap"]);

    const ceap = result.programs[0]!;
    expect(ceap.outcome).toBe("likely-eligible");
    expect(ceap.unit).toEqual(["self", "child-1"]);
    // Eligible, but not yet priced: the level band still needs income (which
    // categorical eligibility skips for the *outcome*, not the figure), and
    // rent has never been asked either. The five-year-old already settles
    // vulnerability, so `disability` never reaches this list.
    expect(ceap.blockedBy).toEqual(["income-sources", "rent"]);
    expect(ceap.figures).toBeUndefined();

    // SNAP does not read `programsAlreadyReceived` — its own income test is
    // the only door it has — so it stays off the map entirely rather than
    // showing up with a guess.
    expect(result.blockingFacts.some((fact) => fact.blocks.includes("snap"))).toBe(true);
  });

  it("prices the figure once income and rent land, still without ever asking about disability", () => {
    const fullyKnown = {
      ...ceapCategoricalHousehold,
      members: [
        { ...ceapCategoricalHousehold.members[0]!, incomeSources: [] },
        { ...ceapCategoricalHousehold.members[1]!, incomeSources: [] },
      ],
      monthlyRent: 150_000,
    };

    // $0 income is at or below 125% FPL for a household of two ($27,050):
    // Level 1. The child is 5, so the household is vulnerable, and it rents.
    // (SNAP is on the map too now that income is known, but stays tier 2
    // pending utility costs — not this test's concern.)
    expect(screen(fullyKnown, ASOF, 0).programs.find((program) => program.programId === "ceap")).toEqual({
      programId: "ceap",
      outcome: "likely-eligible",
      unit: ["self", "child-1"],
      figures: {
        annual: 77_000,
        basis: "2025-26 heating season (FFY2026 LIHEAP-CEAP), October 2025 – September 2026",
      },
      blockedBy: [],
    });
  });

  it("screens income against 60% of State Median Income, not SNAP's 200% FPL line", () => {
    // A household of three at $65,304/year clears SNAP's CT limit ($53,304)
    // and is still under CEAP's 60% SMI ceiling ($77,157) — the two ceilings
    // are different lines, and CEAP uses its own.
    const overSnapLimit: HouseholdProfile = {
      members: [
        member("self", {
          incomeSources: [{ type: "wages", amount: CT_LIMIT_HH3 + 100_000, period: "monthly" }],
        }),
        member("child-1"),
        member("child-2"),
      ],
      monthlyRent: 0,
    };

    const ceap = screen(overSnapLimit, ASOF, 0).programs.find((program) => program.programId === "ceap")!;
    expect(ceap.outcome).toBe("likely-eligible");

    // A dollar over CEAP's own SMI ceiling is likely-ineligible, and reports
    // no figure at all rather than a guessed one.
    const overCeapLimit: HouseholdProfile = {
      ...overSnapLimit,
      members: [
        member("self", {
          incomeSources: [{ type: "wages", amount: Math.ceil(7_715_700 / 12) + 1, period: "monthly" }],
        }),
        member("child-1"),
        member("child-2"),
      ],
    };

    const overResult = screen(overCeapLimit, ASOF, 0).programs.find((program) => program.programId === "ceap")!;
    expect(overResult.outcome).toBe("likely-ineligible");
    expect(overResult.figures).toBeUndefined();
  });

  it("selects the non-vulnerable figure for a household with nobody 60+, disabled, or under 6", () => {
    // Same shape as Maria's household but every member is asked about
    // disability and says no, and nobody is 60+ or under 6 — the only way to
    // reach the non-vulnerable dollar amount rather than the vulnerable one.
    const nonVulnerable: HouseholdProfile = {
      members: [
        member("self", {
          age: 34,
          hasDisability: false,
          incomeSources: [{ type: "wages", amount: 207_200, period: "monthly" }],
        }),
        member("teen", { age: 15, hasDisability: false }),
      ],
      monthlyRent: 160_000,
    };

    // $24,864/year is at or below 125% FPL for a household of two ($27,050):
    // Level 1, non-vulnerable: $595 basic + $125 rental assistance.
    expect(screen(nonVulnerable, ASOF, 0).programs.find((p) => p.programId === "ceap")!.figures).toEqual({
      annual: 72_000,
      basis: "2025-26 heating season (FFY2026 LIHEAP-CEAP), October 2025 – September 2026",
    });
  });

  it("asks about disability only when age cannot already settle vulnerability", () => {
    const noAgeVulnerability: HouseholdProfile = {
      members: [
        member("self", {
          age: 34,
          incomeSources: [{ type: "wages", amount: 207_200, period: "monthly" }],
        }),
        member("teen", { age: 15 }),
      ],
      monthlyRent: 160_000,
    };

    const blocked = screen(noAgeVulnerability, ASOF, 0).programs.find((p) => p.programId === "ceap")!;
    expect(blocked.outcome).toBe("likely-eligible");
    expect(blocked.blockedBy).toEqual(["disability"]);
    expect(blocked.figures).toBeUndefined();

    // A member 60+ settles it without ever asking — Maria's household never
    // reaches `disability` at all (her four-year-old already does, per the
    // fixture above), so this checks the elderly branch of the same rule.
    const withElderlyMember: HouseholdProfile = {
      ...noAgeVulnerability,
      members: [noAgeVulnerability.members[0]!, { ...noAgeVulnerability.members[1]!, age: 62 }],
    };
    expect(blockingFactIds(withElderlyMember)).not.toContain("disability");
  });

  it("includes rental assistance only where the household rents", () => {
    const owns: HouseholdProfile = { ...mariaBeforeHerMother, monthlyRent: 0 };

    // Same household, same level and vulnerability as the fixture above, but
    // no rent: $645 basic only, no rental-assistance component.
    expect(screen(owns, ASOF, 0).programs.find((p) => p.programId === "ceap")!.figures!.annual).toBe(64_500);
  });

  it("labels the FFY2027 season proposed, and does not confuse it with FFY2026", () => {
    const ffy2026 = screen(mariaBeforeHerMother, "2026-09-30", 0).programs.find((p) => p.programId === "ceap")!;
    expect(ffy2026.figures!.provisional).toBeUndefined();
    expect(ffy2026.figures!.basis).toContain("2025-26");

    const ffy2027 = screen(mariaBeforeHerMother, "2026-10-01", 0).programs.find((p) => p.programId === "ceap")!;
    expect(ffy2027.figures!.provisional).toBe(true);
    expect(ffy2027.figures!.basis).toContain("proposed");
    // $705 vulnerable + $140 rental assistance, the FFY2027 Level 1 figures —
    // distinct from FFY2026's $645 + $125 for the identical household.
    expect(ffy2027.figures!.annual).toBe(84_500);
  });

  it("flags the headline total itself once a proposed figure is summed into it", () => {
    // A single sum can't carry a per-entry caveat, so the headline needs its
    // own flag — the FFY2026 headline settles no such flag; the FFY2027 one
    // does, because CEAP's figure is the only thing in it and it is proposed.
    expect(screen(mariaBeforeHerMother, "2026-09-30", 0).headlineAnnualTotalProvisional).toBeUndefined();
    expect(screen(mariaBeforeHerMother, "2026-10-01", 0).headlineAnnualTotalProvisional).toBe(true);
  });
});

describe("HUSKY A and HUSKY D: coverage, never cash", () => {
  it("routes a childless adult to HUSKY D and a parent to HUSKY A at the identical 138% line", () => {
    // Same $1,500/month, same 138% FPL test, different Programs — the
    // ticket's headline claim: routing turns on household composition, not
    // on income (`docs/ct-program-facts.md` §2). Denise's income also clears
    // SNAP's and CEAP's own limits, so both fixtures carry those too; this
    // test only extracts the HUSKY entries.
    const alone = screen(deniseAlone, ASOF, 0);
    expect(alone.programs.map((program) => program.programId)).not.toContain("husky-a");
    expect(alone.programs.find((program) => program.programId === "husky-d")).toEqual({
      programId: "husky-d",
      outcome: "likely-eligible",
      unit: ["denise"],
      noFigureReason: "coverage-not-cash",
      blockedBy: [],
    });

    const withSon = screen(deniseWithHerSon, ASOF, 0);
    expect(withSon.programs.map((program) => program.programId)).not.toContain("husky-d");
    // Denise's own income clears the 138% parent line and her son separately
    // clears the 201% children's line, so both land in the unit.
    expect(withSon.programs.find((program) => program.programId === "husky-a")).toEqual({
      programId: "husky-a",
      outcome: "likely-eligible",
      unit: ["denise", "son"],
      noFigureReason: "coverage-not-cash",
      blockedBy: [],
    });
  });

  it("never carries a figure, and never contributes to the headline", () => {
    const result = screen(deniseWithHerSon, ASOF, 0);
    const huskyA = result.programs.find((program) => program.programId === "husky-a")!;

    expect(huskyA.figures).toBeUndefined();
    expect(huskyA.noFigureReason).toBe("coverage-not-cash");
    expect(result.headlineAnnualTotal).toBe(0);
  });

  it("clears a dependent child at 201% FPL even where the parent misses 138%", () => {
    // A household of two at $3,000/month: over HUSKY A's parent line for two
    // ($2,489) but under its children's line ($3,625). The self is left out
    // of the unit; the child is not.
    const overParentLine: HouseholdProfile = {
      members: [
        member("self", { age: 32, incomeSources: [{ type: "wages", amount: 300_000, period: "monthly" }] }),
        member("child", { age: 6 }),
      ],
    };

    const huskyA = screen(overParentLine, ASOF, 0).programs.find((program) => program.programId === "husky-a")!;
    expect(huskyA.outcome).toBe("likely-eligible");
    expect(huskyA.unit).toEqual(["child"]);
  });

  it("adds a pregnant member at 263% FPL, but only when pregnancy is volunteered", () => {
    // $2,500/month, alone: over HUSKY D's 138% line ($1,836) so HUSKY D is
    // likely-ineligible, and — with nobody pregnant on record — no dependent
    // child or pregnancy route exists for HUSKY A to test at all.
    const maybeExpecting: HouseholdProfile = {
      members: [member("self", { age: 25, incomeSources: [{ type: "wages", amount: 250_000, period: "monthly" }] })],
    };

    const unasked = screen(maybeExpecting, ASOF, 0);
    expect(unasked.programs.map((program) => program.programId)).not.toContain("husky-a");
    expect(unasked.programs.find((program) => program.programId === "husky-d")!.outcome).toBe(
      "likely-ineligible",
    );
    // Never a Blocking fact: nobody is asked to unlock this. Unlike
    // `disability`, pregnancy is not even a `FactId` (`types.ts`) — there is
    // no ranked-list entry for it to appear on at all. What is left is SNAP's
    // and CEAP's own agenda, untouched by HUSKY A's absence.
    expect(unasked.blockingFacts).toEqual([
      { factId: "rent", blocks: ["snap", "ceap"] },
      { factId: "utility-costs", blocks: ["snap"] },
      { factId: "disability", blocks: ["ceap"] },
    ]);

    // The same household, with pregnancy recorded because the Resident
    // volunteered it — $2,500 clears HUSKY A's 263% pregnancy line for one
    // ($3,498), so she joins HUSKY A's unit despite failing HUSKY D's.
    const recorded: HouseholdProfile = {
      members: [{ ...maybeExpecting.members[0]!, isPregnant: true }],
    };

    const result = screen(recorded, ASOF, 0);
    const huskyA = result.programs.find((program) => program.programId === "husky-a")!;
    expect(huskyA.outcome).toBe("likely-eligible");
    expect(huskyA.unit).toEqual(["self"]);
    expect(huskyA.noFigureReason).toBe("coverage-not-cash");
  });

  it("does not screen anyone whose age is unknown", () => {
    // Every SNAP-focused fixture in this file that never states an age is
    // proof of this by construction: HUSKY A/D never appear for them. Stated
    // directly here too, for a household that otherwise looks HUSKY-shaped.
    const agesUnknown: HouseholdProfile = {
      members: [
        member("self", { incomeSources: [{ type: "wages", amount: 150_000, period: "monthly" }] }),
        member("child"),
      ],
    };

    const programIds = screen(agesUnknown, ASOF, 0).programs.map((program) => program.programId);
    expect(programIds).not.toContain("husky-a");
    expect(programIds).not.toContain("husky-d");
  });
});

describe("Care 4 Kids: waitlisted, never a figure", () => {
  it("waitlists a qualifying household rather than pricing it", () => {
    const care4Kids = screen(mariaBeforeHerMother, ASOF, 0).programs.find(
      (program) => program.programId === "care-4-kids",
    )!;

    expect(care4Kids).toEqual({
      programId: "care-4-kids",
      outcome: "likely-eligible",
      unit: ["child-1", "child-2"],
      noFigureReason: "waitlisted",
      waitlist: { typicalWaitMonths: 8, invitingApplicationsReceivedBy: "2025-09-15" },
      blockedBy: [],
    });
  });

  it("never carries a figure, and never contributes to the headline", () => {
    const result = screen(mariaBeforeHerMother, ASOF, 0);
    const care4Kids = result.programs.find((program) => program.programId === "care-4-kids")!;

    expect(care4Kids.figures).toBeUndefined();
    // SNAP's and CEAP's figures only — the exact figure asserted in "computes
    // the whole chain for Maria before her mother" above.
    expect(result.headlineAnnualTotal).toBe(764_600);
  });

  it("requires a qualifying child: under 13, or under 19 with special needs", () => {
    const teenNoSpecialNeeds: HouseholdProfile = {
      members: [
        member("self", { age: 35, incomeSources: [{ type: "wages", amount: 200_000, period: "monthly" }] }),
        member("teen", { age: 15, hasDisability: false }),
      ],
    };

    expect(
      screen(teenNoSpecialNeeds, ASOF, 0).programs.map((program) => program.programId),
    ).not.toContain("care-4-kids");

    const teenWithSpecialNeeds = {
      ...teenNoSpecialNeeds,
      members: [teenNoSpecialNeeds.members[0]!, { ...teenNoSpecialNeeds.members[1]!, hasDisability: true }],
    };

    const care4Kids = screen(teenWithSpecialNeeds, ASOF, 0).programs.find(
      (program) => program.programId === "care-4-kids",
    )!;
    expect(care4Kids.outcome).toBe("likely-eligible");
    expect(care4Kids.unit).toEqual(["teen"]);
  });

  it("asks about disability only when a younger child hasn't already settled it", () => {
    // An 8-year-old already qualifies on age alone, so the unresolved
    // 15-year-old's disability status never reaches Care 4 Kids' own agenda —
    // the same ordering `vulnerabilityOf` uses in `programs/ceap.ts`. CEAP
    // itself still wants `disability` for this household (nobody here is
    // 60+ or under 6 either), so the assertion checks specifically whether
    // `care-4-kids` is one of the Programs the fact is blocking, not merely
    // whether the fact appears at all.
    const blockedByDisability = (profile: HouseholdProfile) =>
      screen(profile, ASOF, 0).blockingFacts.find((fact) => fact.factId === "disability")?.blocks ?? [];

    const youngerChildSettlesIt: HouseholdProfile = {
      members: [
        member("self", { age: 35, incomeSources: [{ type: "wages", amount: 200_000, period: "monthly" }] }),
        member("child", { age: 8, incomeSources: [] }),
        member("teen", { age: 15 }),
      ],
    };

    expect(blockedByDisability(youngerChildSettlesIt)).not.toContain("care-4-kids");
    expect(blockedByDisability(youngerChildSettlesIt)).toContain("ceap");

    const onlyTheTeen: HouseholdProfile = {
      members: [
        member("self", { age: 35, incomeSources: [{ type: "wages", amount: 200_000, period: "monthly" }] }),
        member("teen", { age: 15 }),
      ],
    };

    expect(blockedByDisability(onlyTheTeen)).toContain("care-4-kids");
  });

  it("requires a working parent, and does not detect a studying one", () => {
    // The same household as Maria's, but her only income is unearned — no
    // wages, no self-employment. Care 4 Kids has no way to tell a studying
    // parent from a non-working one, so this screens likely-ineligible: a
    // named limitation (`programs/care-4-kids.ts`), not a silent one.
    const noEarnedIncome: HouseholdProfile = {
      ...mariaBeforeHerMother,
      members: [
        member("self", {
          age: 31,
          incomeSources: [{ type: "social-security", amount: 207_200, period: "monthly" }],
        }),
        member("child-1", { age: 9 }),
        member("child-2", { age: 4 }),
      ],
    };

    const care4Kids = screen(noEarnedIncome, ASOF, 0).programs.find(
      (program) => program.programId === "care-4-kids",
    )!;
    expect(care4Kids.outcome).toBe("likely-ineligible");
  });

  it("screens income against 60% of State Median Income, the same ceiling Care 4 Kids' own income guidelines use", () => {
    const overCeiling: HouseholdProfile = {
      members: [
        member("self", {
          age: 35,
          incomeSources: [{ type: "wages", amount: Math.ceil(7_715_700 / 12) + 1, period: "monthly" }],
        }),
        member("child", { age: 4, incomeSources: [] }),
        member("other", { incomeSources: [] }),
      ],
    };

    const care4Kids = screen(overCeiling, ASOF, 0).programs.find(
      (program) => program.programId === "care-4-kids",
    )!;
    expect(care4Kids.outcome).toBe("likely-ineligible");
    expect(care4Kids.figures).toBeUndefined();
  });

  it("falls off the map outside its FFY2026 window, rather than guessing a later one", () => {
    expect(
      screen(mariaBeforeHerMother, "2026-10-01", 0).programs.map((program) => program.programId),
    ).not.toContain("care-4-kids");
  });
});
