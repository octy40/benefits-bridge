import { describe, expect, it } from "vitest";
import { ctBbceBoundaryHousehold, mariaBeforeHerMother } from "./fixtures";
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

describe("screen", () => {
  it("returns an empty eligibility map for an empty Household profile", () => {
    expect(screen(emptyHouseholdProfile(), ASOF, 0)).toEqual({
      asOf: ASOF,
      sequence: 0,
      programs: [],
      keychain: [],
      headlineAnnualTotal: 0,
      // Nothing is known, so every fact SNAP needs is missing. Ranked by how
      // many Programs each blocks; tied at one apiece, they fall into the order
      // a caseworker asks in — people, then who eats together, then money.
      blockingFacts: [
        { factId: "household-members", blocks: ["snap"] },
        { factId: "food-sharing", blocks: ["snap"] },
        { factId: "income-sources", blocks: ["snap"] },
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
      ],
      keychain: [],
      // An entry with no defensible figure contributes nothing rather than a zero.
      headlineAnnualTotal: 0,
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
  it("asks who eats together before asking what anyone earns", () => {
    const profile: HouseholdProfile = {
      members: [{ id: "self" }, { id: "mother" }],
    };

    expect(screen(profile, ASOF, 0).blockingFacts).toEqual([
      { factId: "food-sharing", blocks: ["snap"] },
      { factId: "income-sources", blocks: ["snap"] },
    ]);
  });

  it("distinguishes a member with no income from a member nobody has asked", () => {
    const unasked: HouseholdProfile = { members: [{ id: "self", sharesFoodPurchaseAndPreparation: true }] };
    const asked: HouseholdProfile = { members: [member("self")] };

    expect(screen(unasked, ASOF, 0).blockingFacts).toEqual([
      { factId: "income-sources", blocks: ["snap"] },
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
    expect(result.blockingFacts).toEqual([{ factId: "work-hours", blocks: ["snap"] }]);
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
      { factId: "rent", blocks: ["snap"] },
      { factId: "utility-costs", blocks: ["snap"] },
    ]);
  });

  it("does not ask a likely-ineligible household what it pays in rent", () => {
    // Rent buys an allotment this household is not going to be offered, so
    // asking for it would put a question into the conversation that buys the
    // Resident nothing.
    const overLimit = householdOfThree(CT_LIMIT_HH3 + 100_000);

    expect(screen(overLimit, ASOF, 0).blockingFacts).toEqual([]);
    expect(screen(overLimit, ASOF, 0).programs[0]!.blockedBy).toEqual([]);
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
      ],
      keychain: [],
      // The first tier-1 figure, and therefore the first headline that is not
      // zero. Every derived form is here so the model never divides (ADR-0010).
      headlineAnnualTotal: 687_600,
      blockingFacts: [],
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
    expect(tierOne.headlineAnnualTotal).toBe(687_600);
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

describe("effective-dated figures", () => {
  it("screens SNAP inside the period its figures are published for", () => {
    expect(screen(ctBbceBoundaryHousehold, "2025-10-01", 0).programs).toHaveLength(1);
    expect(screen(ctBbceBoundaryHousehold, "2026-09-30", 0).programs).toHaveLength(1);
  });

  it("leaves SNAP off the map on either side of that period rather than quoting stale figures", () => {
    // FY2027 figures land on 2026-10-01 and USDA had not published them when
    // this table was written. A Program with no figures in force is one
    // BenefitBridge cannot screen — not one it screens with last year's numbers.
    expect(screen(ctBbceBoundaryHousehold, "2026-10-01", 0).programs).toEqual([]);
    expect(screen(ctBbceBoundaryHousehold, "2025-09-30", 0).programs).toEqual([]);
  });

  it("carries no allotment figure outside the FY2026 window", () => {
    // Maria's household is unchanged and fully known; only the date moved. The
    // figure goes with the tables it was computed from rather than surviving
    // them, and the headline goes with it.
    expect(screen(mariaBeforeHerMother, "2026-09-30", 0).programs[0]!.figures!.monthly).toBe(57_300);

    expect(screen(mariaBeforeHerMother, "2026-10-01", 0).programs).toEqual([]);
    expect(screen(mariaBeforeHerMother, "2026-10-01", 0).headlineAnnualTotal).toBe(0);
    expect(screen(mariaBeforeHerMother, "2025-09-30", 0).programs).toEqual([]);
  });

  it("reports no Blocking facts for a Program no published figures cover", () => {
    // Nothing the Resident could say would unblock it, so it must not put a
    // question into the conversation.
    expect(screen(emptyHouseholdProfile(), "2026-10-01", 0).blockingFacts).toEqual([]);
  });
});
