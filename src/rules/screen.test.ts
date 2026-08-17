import { describe, expect, it } from "vitest";
import { ctBbceBoundaryHousehold } from "./fixtures";
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
          blockedBy: [],
        },
      ],
      keychain: [],
      // No figure yet, so nothing to sum: the allotment is its own ticket, and
      // an entry with no defensible figure contributes nothing rather than a zero.
      headlineAnnualTotal: 0,
      blockingFacts: [],
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

    const result = screen(alone, ASOF, 0);
    expect(result.blockingFacts).toEqual([]);
    expect(result.programs[0]!.unit).toEqual(["self"]);
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
    expect(screen(asked, ASOF, 0).blockingFacts).toEqual([]);
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
    expect(screen(ctBbceBoundaryHousehold, ASOF, 0).blockingFacts).toEqual([]);
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

  it("reports no Blocking facts for a Program no published figures cover", () => {
    // Nothing the Resident could say would unblock it, so it must not put a
    // question into the conversation.
    expect(screen(emptyHouseholdProfile(), "2026-10-01", 0).blockingFacts).toEqual([]);
  });
});
