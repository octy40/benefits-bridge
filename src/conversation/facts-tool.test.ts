import { describe, expect, it } from "vitest";
import { mergeFacts, recordHouseholdFactsTool } from "./facts-tool";
import { emptyHouseholdProfile, type HouseholdProfile } from "@/rules/types";

describe("record_household_facts tool definition", () => {
  it("asks for money in dollars, so converting to cents stays in code", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);
    expect(schema).toContain("Dollars");
    expect(schema).not.toContain("Cents");
  });

  it("offers no household size and no income field for the model to fill in", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);
    expect(schema).not.toContain("householdSize");
    expect(schema).not.toMatch(/"income"\s*:/);
  });
});

describe("mergeFacts", () => {
  it("adds a member the conversation has not heard of yet", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      members: [{ id: "self", age: 31, relationship: "self" }],
    });

    // No income list at all, rather than an empty one: a member nobody has
    // asked about must keep income on the Blocking facts list.
    expect(merged.members).toEqual([{ id: "self", age: 31, relationship: "self" }]);
  });

  it("records that a member was asked and has no income, distinctly from not asking", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      members: [{ id: "child-1", age: 4, incomeSources: [] }, { id: "child-2", age: 9 }],
    });

    expect(merged.members[0]!.incomeSources).toEqual([]);
    expect(merged.members[1]!.incomeSources).toBeUndefined();
  });

  it("keeps hours against an hourly rate, and does not multiply them out", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      members: [
        { id: "self", incomeSources: [{ type: "wages", amountDollars: 20, period: "hourly", hoursPerWeek: 37 }] },
      ],
    });

    expect(merged.members[0]!.incomeSources).toEqual([
      { type: "wages", amount: 2_000, period: "hourly", hoursPerWeek: 37 },
    ]);
  });

  it("updates a known member without dropping facts it was not told about", () => {
    const profile: HouseholdProfile = {
      members: [{ id: "self", age: 31, relationship: "self", incomeSources: [] }],
    };

    const merged = mergeFacts(profile, {
      members: [{ id: "self", sharesFoodPurchaseAndPreparation: true }],
    });

    expect(merged.members[0]).toEqual({
      id: "self",
      age: 31,
      relationship: "self",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [],
    });
  });

  it("converts dollar amounts to cents rather than letting the model do it", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      monthlyRentDollars: 1900,
      members: [
        { id: "self", incomeSources: [{ type: "wages", amountDollars: 1800.5, period: "monthly" }] },
      ],
    });

    expect(merged.monthlyRent).toBe(190_000);
    expect(merged.members[0]!.incomeSources).toEqual([
      { type: "wages", amount: 180_050, period: "monthly" },
    ]);
  });

  it("replaces a member's income sources when they are re-reported, so a correction lands", () => {
    const profile: HouseholdProfile = {
      members: [
        {
          id: "self",
          incomeSources: [{ type: "wages", amount: 180_000, period: "monthly" }],
        },
      ],
    };

    const merged = mergeFacts(profile, {
      members: [
        {
          id: "self",
          incomeSources: [
            { type: "wages", amountDollars: 1500, period: "monthly" },
            { type: "cash-self-employment", amountDollars: 300, period: "monthly" },
          ],
        },
      ],
    });

    expect(merged.members[0]!.incomeSources).toEqual([
      { type: "wages", amount: 150_000, period: "monthly" },
      { type: "cash-self-employment", amount: 30_000, period: "monthly" },
    ]);
  });

  it("merges household-level facts", () => {
    const merged = mergeFacts(
      { members: [], town: "Stamford" },
      { utilitiesPaid: ["heat", "electricity"], programsAlreadyReceived: ["snap"] },
    );

    expect(merged.town).toBe("Stamford");
    expect(merged.utilitiesPaid).toEqual(["heat", "electricity"]);
    expect(merged.programsAlreadyReceived).toEqual(["snap"]);
  });

  it("does not mutate the profile it was given", () => {
    const profile: HouseholdProfile = {
      members: [{ id: "self", age: 31, incomeSources: [] }],
    };

    mergeFacts(profile, { members: [{ id: "self", age: 32 }], monthlyRentDollars: 1900 });

    expect(profile).toEqual({ members: [{ id: "self", age: 31, incomeSources: [] }] });
  });

  it("never produces a household size or a single income figure", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      members: [{ id: "self", incomeSources: [{ type: "wages", amountDollars: 1800, period: "monthly" }] }],
    });

    expect(merged).not.toHaveProperty("householdSize");
    expect(merged).not.toHaveProperty("income");
    expect(merged.members[0]).not.toHaveProperty("income");
  });
});
