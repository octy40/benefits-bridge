import { describe, expect, it } from "vitest";
import {
  ceapCategoricalHousehold,
  ctBbceBoundaryHousehold,
  declinedStatusHousehold,
  lidrIncomeOnlyHousehold,
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
      // Nothing is known, so every fact each Program or Keychain entry needs
      // is missing. Ranked by how many each blocks: neither CEAP nor a
      // Keychain rule has a food-sharing concept of its own (each unit is the
      // whole household), so `household-members` and `income-sources` each
      // block four entries and outrank `food-sharing`, which blocks only SNAP
      // — exactly ADR-0002's promise that a new entry starts pulling on the
      // conversation with no prompt change.
      blockingFacts: [
        { factId: "household-members", blocks: ["snap", "ceap", "lifeline", "lidr"] },
        { factId: "income-sources", blocks: ["snap", "ceap", "lifeline", "lidr"] },
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
      ],
      // $43,280.04/year is over Lifeline's 135% FPL ceiling for a household of
      // three ($36,882): likely-ineligible, no figure. CEAP being
      // likely-eligible auto-enrols the household in the utility discount
      // rate regardless — the link `keychain/lidr.ts` reads off `programs`
      // (`docs/ct-program-facts.md` §7) — so LIDR appears too, priced in a
      // discount rate rather than cash.
      keychain: [
        { programId: "lifeline", outcome: "likely-ineligible", unit: ["self", "child-1", "child-2"], blockedBy: [] },
        {
          programId: "lidr",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
      ],
      // SNAP has no defensible figure yet, and neither Keychain entry carries
      // one either, so CEAP's is the whole headline.
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
    // fact SNAP needs before it can even ask about income. CEAP and the
    // Keychain have no food-sharing concept of their own and want income
    // straight away, so once they are in the mix `income-sources` blocks more
    // entries than food-sharing's one and outranks it. Nothing about SNAP
    // changed; CEAP and the Keychain landing is what moved this (ADR-0002).
    const profile: HouseholdProfile = {
      members: [{ id: "self" }, { id: "mother" }],
    };

    expect(screen(profile, ASOF, 0).blockingFacts).toEqual([
      { factId: "income-sources", blocks: ["snap", "ceap", "lifeline", "lidr"] },
      { factId: "food-sharing", blocks: ["snap"] },
    ]);
  });

  it("distinguishes a member with no income from a member nobody has asked", () => {
    const unasked: HouseholdProfile = { members: [{ id: "self", sharesFoodPurchaseAndPreparation: true }] };
    const asked: HouseholdProfile = { members: [member("self")] };

    expect(screen(unasked, ASOF, 0).blockingFacts).toEqual([
      { factId: "income-sources", blocks: ["snap", "ceap", "lifeline", "lidr"] },
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
    expect(result.blockingFacts).toEqual([{ factId: "work-hours", blocks: ["snap", "ceap", "lifeline", "lidr"] }]);
    // Blocked means absent from the map, never present with a guess.
    expect(result.programs).toEqual([]);
    expect(result.keychain).toEqual([]);
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
      ],
      // $24,864/year also clears Lifeline's 135% FPL ceiling ($36,882): a
      // second tier-1 figure, $111 a year flat. CEAP being likely-eligible
      // auto-enrols the household in the utility discount rate too
      // (`keychain/lidr.ts` reads CEAP's outcome off `programs`), priced in a
      // discount rate rather than cash.
      keychain: [
        {
          programId: "lifeline",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: { monthly: 925, annual: 11_100, basis: "FCC/USAC Lifeline monthly support (2026 guidelines)" },
          blockedBy: [],
        },
        {
          programId: "lidr",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
      ],
      // SNAP's, CEAP's, and now Lifeline's figures together.
      headlineAnnualTotal: 775_700,
      blockingFacts: [],
      // Nothing is left to ask, so the one optional question opens — and only
      // now, so it never competes with the ranked list (ADR-0002, ADR-0004).
      // CEAP carries the same status shape as SNAP (`docs/ct-program-facts.md`
      // §8), so it joins the question the moment it too has nothing left on
      // the Blocking facts list.
      statusQuestion: { blocks: ["snap", "ceap"] },
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
    // CEAP's own figure ($770) and Lifeline's ($111) are on the map by now
    // too, so the headline is all three together.
    expect(tierOne.headlineAnnualTotal).toBe(775_700);
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
    // SNAP's $6,876 plus CEAP's $770 plus Lifeline's $111 — SNAP and CEAP are
    // status-dependent and live once nobody has been asked; Lifeline is not
    // status-dependent at all (`docs/ct-program-facts.md` §7) and scores the
    // same either way.
    expect(screen(mariaBeforeHerMother, ASOF, 1).headlineAnnualTotal).toBe(775_700);

    expect(screen(declinedStatusHousehold, ASOF, 1).programs[0]!.figures).toBeUndefined();
    // SNAP and CEAP drop out, but Lifeline's $111 does not — declining the
    // immigration status question costs nothing on a Keychain entry that
    // never asked about it.
    expect(screen(declinedStatusHousehold, ASOF, 1).headlineAnnualTotal).toBe(11_100);
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
        // CEAP carries the same status shape as SNAP (`docs/ct-program-facts.md`
        // §8) and passes through the same `statusDependent` wrap, so a decline
        // lands it on Indeterminate too.
        {
          programId: "ceap",
          outcome: "indeterminate",
          unit: ["self", "child-1", "child-2"],
          blockedBy: [],
        },
      ],
      // Neither Keychain rule here is status-dependent (`docs/ct-program-facts.md`
      // §7 marks Lifeline's status test practically nonexistent and LIDR
      // unverified either way, so BenefitBridge implements neither). Lifeline
      // scores off income exactly as it would for an unasked household. LIDR's
      // usual auto-enrollment route reads CEAP's outcome (`keychain/lidr.ts`)
      // and CEAP is Indeterminate here, so that route is closed — but LIDR's
      // own income test is not: $24,864/year clears its 50% tier ceiling
      // (100% FPL for a household of three, $27,320) on its own.
      keychain: [
        {
          programId: "lifeline",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: { monthly: 925, annual: 11_100, basis: "FCC/USAC Lifeline monthly support (2026 guidelines)" },
          blockedBy: [],
        },
        {
          programId: "lidr",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
      ],
      // `headlineTotal` sums likely-eligible entries only, so an entry
      // BenefitBridge cannot put either way cannot be counted as money owed.
      // Lifeline's $111 is the only figure left standing.
      //
      // What this cannot assert, and must not fake: the ticket asks that
      // status-blind Programs still be scored and the headline still be
      // produced from them. SNAP and CEAP are the only implemented Programs
      // and both are status-dependent, so Lifeline's figure alone is the
      // correct headline here. The CT Elderly/Disabled Renters' Rebate is the
      // only genuinely status-blind Program on the list
      // (`docs/ct-program-facts.md` §8); it is issue #17, gated on issue #10,
      // and when it lands this assertion should carry a larger headline
      // alongside two Indeterminate entries.
      headlineAnnualTotal: 11_100,
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
      ],
      // Same as the declined case: neither Keychain rule is status-dependent,
      // and LIDR's own income test still clears its 50% tier on its own.
      keychain: [
        {
          programId: "lifeline",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: { monthly: 925, annual: 11_100, basis: "FCC/USAC Lifeline monthly support (2026 guidelines)" },
          blockedBy: [],
        },
        {
          programId: "lidr",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
      ],
      headlineAnnualTotal: 11_100,
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
      ],
      keychain: [
        {
          programId: "lifeline",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          figures: { monthly: 925, annual: 11_100, basis: "FCC/USAC Lifeline monthly support (2026 guidelines)" },
          blockedBy: [],
        },
        {
          programId: "lidr",
          outcome: "likely-eligible",
          unit: ["self", "child-1", "child-2"],
          noFigureReason: "coverage-not-cash",
          blockedBy: [],
        },
      ],
      headlineAnnualTotal: 775_700,
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

    expect(screen(mariaBeforeHerMother, ASOF, 0).statusQuestion).toEqual({ blocks: ["snap", "ceap"] });
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
    // its own FFY2027 table (proposed) already covers 2026-10-01, so the map
    // is CEAP alone rather than empty (CONTEXT.md, *Effective-dated figures*).
    expect(programIds(ctBbceBoundaryHousehold, "2026-10-01")).toEqual(["ceap"]);
    // Before either table starts, neither Program is on the map.
    expect(programIds(ctBbceBoundaryHousehold, "2025-09-30")).toEqual([]);
  });

  it("carries no SNAP allotment figure outside the FY2026 window", () => {
    // Maria's household is unchanged and fully known; only the date moved. The
    // figure goes with the tables it was computed from rather than surviving
    // them, and the headline goes with it.
    expect(screen(mariaBeforeHerMother, "2026-09-30", 0).programs[0]!.figures!.monthly).toBe(57_300);

    // CEAP's FFY2027 table has already begun (proposed) where SNAP's FY2026
    // one just ended, so the map holds CEAP's figure rather than nothing.
    // Lifeline is not effective-dated at all, so its $111 rides along either
    // way.
    const dayAfter = screen(mariaBeforeHerMother, "2026-10-01", 0);
    expect(programIds(mariaBeforeHerMother, "2026-10-01")).toEqual(["ceap"]);
    expect(dayAfter.headlineAnnualTotal).toBe(95_600);

    expect(screen(mariaBeforeHerMother, "2025-09-30", 0).programs).toEqual([]);
  });

  it("reports no Blocking facts for either Program when no table covers the date at all", () => {
    // Nothing the Resident could say would unblock either Program, so neither
    // must put a question into the conversation. Before 2025-10-01 is the one
    // date left where that is true for both SNAP and CEAP at once — but the
    // Keychain is not effective-dated (`keychain/lifeline.ts`,
    // `keychain/lidr.ts` carry no `EffectiveDated` table), so Lifeline and
    // LIDR still want to know who is in the household and what it earns
    // regardless of the date.
    expect(screen(emptyHouseholdProfile(), "2025-09-30", 0).blockingFacts).toEqual([
      { factId: "household-members", blocks: ["lifeline", "lidr"] },
      { factId: "income-sources", blocks: ["lifeline", "lidr"] },
    ]);
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

describe("Keychain: Lifeline, LIDR, and Museums for All", () => {
  /**
   * The fixture issue #21 was written around: a lookup keyed off SNAP
   * participation would report nothing for this household, because it has
   * never received SNAP and is over Connecticut's SNAP limit for a household
   * of one. The utility Low-Income Discount Rate's own, independent income
   * test reaches further than SNAP's does and catches it anyway.
   */
  it("returns a non-empty Keychain for a household SNAP screens out but LIDR's own income test still reaches", () => {
    const result = screen(lidrIncomeOnlyHousehold, ASOF, 0);

    expect(result.programs.find((program) => program.programId === "snap")!.outcome).toBe("likely-ineligible");

    expect(result.keychain).not.toEqual([]);
    const lidr = result.keychain.find((entry) => entry.programId === "lidr")!;
    expect(lidr.outcome).toBe("likely-eligible");
    expect(lidr.noFigureReason).toBe("coverage-not-cash");

    // $40,000/year clears Lifeline's own, narrower 135% FPL ceiling for a
    // household of one ($21,546): the fixture is deliberately built so only
    // LIDR carries the case.
    const lifeline = result.keychain.find((entry) => entry.programId === "lifeline")!;
    expect(lifeline.outcome).toBe("likely-ineligible");
  });

  describe("Lifeline", () => {
    it("scores likely-eligible from participation alone, income never asked", () => {
      for (const program of ["snap", "medicaid", "ssi", "federal-public-housing-assistance", "veterans-pension"]) {
        const household: HouseholdProfile = {
          members: [{ id: "self" }],
          programsAlreadyReceived: [program],
        };

        const lifeline = screen(household, ASOF, 0).keychain.find((entry) => entry.programId === "lifeline")!;
        expect(lifeline.outcome).toBe("likely-eligible");
        expect(lifeline.figures).toEqual({
          monthly: 925,
          annual: 11_100,
          basis: "FCC/USAC Lifeline monthly support (2026 guidelines)",
        });
      }
    });

    it("screens the income route at 135% FPL, not a program a household never received", () => {
      // $21,546 is 135% FPL for a household of one, to the dollar.
      const atLimit: HouseholdProfile = {
        members: [{ id: "self", incomeSources: [{ type: "wages", amount: 2_154_600, period: "annual" }] }],
      };
      const overLimit: HouseholdProfile = {
        members: [{ id: "self", incomeSources: [{ type: "wages", amount: 2_154_700, period: "annual" }] }],
      };

      expect(screen(atLimit, ASOF, 0).keychain.find((entry) => entry.programId === "lifeline")!.outcome).toBe(
        "likely-eligible",
      );
      expect(screen(overLimit, ASOF, 0).keychain.find((entry) => entry.programId === "lifeline")!.outcome).toBe(
        "likely-ineligible",
      );
    });
  });

  describe("the utility Low-Income Discount Rate (LIDR)", () => {
    it("scores likely-eligible from program participation alone, income never asked", () => {
      for (const program of ["snap", "husky", "ssi", "ssdi", "medicaid", "section-8"]) {
        const household: HouseholdProfile = {
          members: [{ id: "self" }],
          programsAlreadyReceived: [program],
        };

        const lidr = screen(household, ASOF, 0).keychain.find((entry) => entry.programId === "lidr")!;
        expect(lidr.outcome).toBe("likely-eligible");
        expect(lidr.blockedBy).toEqual([]);
      }
    });

    /**
     * The auto-enrollment the FFY2027 LIHEAP plan describes
     * (`docs/ct-program-facts.md` §7): applying for CEAP enrols a household in
     * LIDR even when neither of LIDR's own routes — its participation list or
     * its own income test — has anything to go on. TFA is on CEAP's
     * categorical list but deliberately not on LIDR's own, and income is never
     * recorded, so LIDR's `likely-eligible` outcome here can only have come
     * from reading CEAP's outcome off `programs` (`keychain/lidr.ts`).
     */
    it("auto-enrols a household the moment CEAP screens likely-eligible, even with no income and no route of its own", () => {
      const appliedForCeap: HouseholdProfile = {
        members: [{ id: "self" }],
        programsAlreadyReceived: ["tfa"],
      };

      const result = screen(appliedForCeap, ASOF, 0);
      expect(result.programs.find((program) => program.programId === "ceap")!.outcome).toBe("likely-eligible");

      const lidr = result.keychain.find((entry) => entry.programId === "lidr")!;
      expect(lidr.outcome).toBe("likely-eligible");
      expect(lidr.noFigureReason).toBe("coverage-not-cash");

      // Program receipt alone would not have done it: TFA is not on LIDR's
      // own participation list, and Lifeline's list doesn't carry it either.
      expect(result.keychain.find((entry) => entry.programId === "lifeline")).toBeUndefined();
    });

    it("screens the widest income tier at 60% State Median Income, not SNAP's or Lifeline's narrower ceilings", () => {
      // $48,714 is 60% SMI (FFY2027) for a household of one — LIDR's own
      // ceiling — to the dollar.
      const atCeiling: HouseholdProfile = {
        members: [{ id: "self", incomeSources: [{ type: "wages", amount: 4_871_400, period: "annual" }] }],
      };
      const overCeiling: HouseholdProfile = {
        members: [{ id: "self", incomeSources: [{ type: "wages", amount: 4_871_500, period: "annual" }] }],
      };

      expect(screen(atCeiling, ASOF, 0).keychain.find((entry) => entry.programId === "lidr")!.outcome).toBe(
        "likely-eligible",
      );
      expect(screen(overCeiling, ASOF, 0).keychain.find((entry) => entry.programId === "lidr")!.outcome).toBe(
        "likely-ineligible",
      );
    });

    // Issue #21's acceptance criteria names this exclusion explicitly: MPP
    // needs hardship status and a 60-day past-due balance, neither of which
    // BenefitBridge elicits, so it is not among the Keychain program ids any
    // household can produce (`keychain/lidr.ts`).
    it("never screens the Matching Payment Program", () => {
      const everythingEligible: HouseholdProfile = {
        ...mariaBeforeHerMother,
        programsAlreadyReceived: ["snap"],
      };

      const keychainIds = screen(everythingEligible, ASOF, 0).keychain.map((entry) => entry.programId);
      expect(keychainIds).not.toContain("matching-payment-program");
      expect(keychainIds).not.toContain("mpp");
    });
  });

  describe("Museums for All", () => {
    it("derives strictly from SNAP receipt", () => {
      const receivesSnap: HouseholdProfile = {
        members: [{ id: "self" }],
        programsAlreadyReceived: ["snap"],
      };

      const museums = screen(receivesSnap, ASOF, 0).keychain.find((entry) => entry.programId === "museums-for-all")!;
      expect(museums.outcome).toBe("likely-eligible");
      expect(museums.noFigureReason).toBe("coverage-not-cash");
    });

    it("does not appear for a household merely screened likely-eligible for SNAP, never having received it", () => {
      // Maria's household is likely-eligible for SNAP on this very map, and
      // has never recorded receiving it — Museums for All needs the EBT card
      // in hand, not the screening result (`docs/ct-program-facts.md` §7).
      const result = screen(mariaBeforeHerMother, ASOF, 0);
      expect(result.programs.find((program) => program.programId === "snap")!.outcome).toBe("likely-eligible");
      expect(result.keychain.find((entry) => entry.programId === "museums-for-all")).toBeUndefined();
    });
  });

  it("evaluates the Keychain after Programs, and returns it in ScreeningResult.keychain", () => {
    // Structural: `keychain` is its own field, distinct from `programs`, and
    // every assertion above already depends on Program outcomes (SNAP, CEAP)
    // being computed first — this just names the contract issue #21 asks for.
    const result = screen(ceapCategoricalHousehold, ASOF, 0);
    expect(result).toHaveProperty("keychain");
    expect(result.keychain).not.toBe(result.programs);
  });
});
