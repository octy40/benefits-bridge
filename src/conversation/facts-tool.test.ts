import { describe, expect, it } from "vitest";
import { mergeFacts, recordHouseholdFactsTool } from "./facts-tool";
import { emptyHouseholdProfile, type HouseholdProfile } from "@/rules/types";

describe("record_household_facts tool definition", () => {
  it("asks for money in dollars, so converting to cents stays in code", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);
    expect(schema).toContain("Dollars");
    expect(schema).not.toContain("Cents");
  });

  it("gives the model somewhere to put the rent and utilities SNAP prices its allotment from", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);

    expect(schema).toContain("monthlyRentDollars");
    // A closed list rather than free text: SNAP's utility allowance turns on
    // *which* utilities, and "heating" versus "heat" would otherwise decide a
    // $976 allowance by string match.
    expect(schema).toContain("utilitiesPaid");
    expect(schema).toContain("heat");
    expect(schema).toContain("air-conditioning");
    // The empty-array convention has to reach the model, or a household whose
    // rent covers everything waits forever for a figure.
    expect(schema).toContain("empty array");
  });

  it("gives the model a way to record a decline, not just an answer", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);

    // Three values, and `declined` is the load-bearing one: it is the only
    // thing that closes the question without answering it (ADR-0004).
    expect(schema).toContain("immigrationStatus");
    expect(schema).toContain("declined");
    expect(schema).toContain("all-qualifying");
    expect(schema).toContain("mixed");
    // The reason has to reach the model, or the question gets put as a demand.
    expect(schema).toContain("Never required");
  });

  it("offers no household size and no income field for the model to fill in", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);
    expect(schema).not.toContain("householdSize");
    expect(schema).not.toMatch(/"income"\s*:/);
  });

  it("names the categorically-eligible Programs so the model knows to record them", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);

    // CEAP's categorical-eligibility route is the case that proves the
    // product's thesis; the model has to know these strings are worth
    // capturing or the household never gets the benefit of it.
    expect(schema).toContain("tfa");
    expect(schema).toContain("refugee-cash-assistance");
    expect(schema).toContain("state-supplement");
    expect(schema).toContain("hasDisability");
  });

  it("tells the model never to ask about pregnancy, only to record it if offered", () => {
    const schema = JSON.stringify(recordHouseholdFactsTool.input_schema);

    expect(schema).toContain("isPregnant");
    expect(schema).toContain("never");
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

  it("records a member's disability, distinctly from not asking", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      members: [{ id: "self", hasDisability: true }, { id: "child-1" }],
    });

    expect(merged.members[0]!.hasDisability).toBe(true);
    expect(merged.members[1]!.hasDisability).toBeUndefined();
  });

  it("records a member's pregnancy, distinctly from not asking", () => {
    const merged = mergeFacts(emptyHouseholdProfile(), {
      members: [{ id: "self", isPregnant: true }, { id: "child-1" }],
    });

    expect(merged.members[0]!.isPregnant).toBe(true);
    expect(merged.members[1]!.isPregnant).toBeUndefined();
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

  it("records that a household pays for no utilities, distinctly from not asking", () => {
    // Same distinction as `incomeSources`: `[]` unblocks the SNAP allotment
    // with an allowance of nothing, absent keeps the question on the agenda.
    expect(mergeFacts(emptyHouseholdProfile(), { utilitiesPaid: [] }).utilitiesPaid).toEqual([]);
    expect(mergeFacts(emptyHouseholdProfile(), {}).utilitiesPaid).toBeUndefined();
  });

  it("records a declined status distinctly from nobody having asked", () => {
    // The same distinction `incomeSources` and `utilitiesPaid` draw, and here
    // it decides whether the question may be put again at all.
    expect(mergeFacts(emptyHouseholdProfile(), { immigrationStatus: "declined" }).immigrationStatus).toBe(
      "declined",
    );
    expect(mergeFacts(emptyHouseholdProfile(), {}).immigrationStatus).toBeUndefined();
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
