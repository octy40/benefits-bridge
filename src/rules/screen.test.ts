import { describe, expect, it } from "vitest";
import { screen } from "./screen";
import { emptyHouseholdProfile, type HouseholdProfile } from "./types";

/**
 * Per the spec, tests assert on the whole `ScreeningResult` for a given
 * Household profile and `asOf`. They never reach inside `screen` — the
 * decomposition behind the seam is expected to change (ADR-0011).
 *
 * `screen` scores nothing yet, so these pin the contract the walking skeleton
 * establishes, not any Program's rules.
 */
describe("screen", () => {
  it("returns an empty eligibility map for an empty Household profile", () => {
    expect(screen(emptyHouseholdProfile(), "2026-08-15", 0)).toEqual({
      asOf: "2026-08-15",
      sequence: 0,
      programs: [],
      keychain: [],
      headlineAnnualTotal: 0,
      blockingFacts: [],
    });
  });

  it("scores nothing yet even for a household with members and income", () => {
    const maria: HouseholdProfile = {
      members: [
        {
          id: "self",
          age: 31,
          relationship: "self",
          sharesFoodPurchaseAndPreparation: true,
          incomeSources: [{ type: "wages", amount: 180_000, period: "monthly" }],
        },
        { id: "child-1", age: 4, relationship: "child", sharesFoodPurchaseAndPreparation: true, incomeSources: [] },
      ],
      town: "Stamford",
      monthlyRent: 190_000,
    };

    const result = screen(maria, "2026-08-15", 0);

    expect(result.programs).toEqual([]);
    expect(result.keychain).toEqual([]);
    expect(result.headlineAnnualTotal).toBe(0);
  });

  it("reads its date from asOf rather than the clock", () => {
    expect(screen(emptyHouseholdProfile(), "2025-01-01", 0).asOf).toBe("2025-01-01");
    expect(screen(emptyHouseholdProfile(), "2027-10-01", 0).asOf).toBe("2027-10-01");
  });

  it("carries the sequence it was given, so earlier maps can be marked superseded", () => {
    expect(screen(emptyHouseholdProfile(), "2026-08-15", 4).sequence).toBe(4);
  });

  it("does not mutate the Household profile it is given", () => {
    const profile = emptyHouseholdProfile();
    screen(profile, "2026-08-15", 0);
    expect(profile).toEqual({ members: [] });
  });
});
