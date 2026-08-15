import { describe, expect, it } from "vitest";
import { buildEligibilityMapToolResult } from "./eligibility-map-tool-result";
import type { ScreeningResult } from "@/rules/types";

const emptyMap = (sequence: number): ScreeningResult => ({
  asOf: "2026-08-15",
  sequence,
  programs: [],
  keychain: [],
  headlineAnnualTotal: 0,
  blockingFacts: [],
});

const mapWithSnap = (sequence: number, annual: number, monthly: number): ScreeningResult => ({
  ...emptyMap(sequence),
  programs: [
    {
      programId: "snap",
      outcome: "likely-eligible",
      unit: ["self", "child-1"],
      figures: { annual, monthly },
      blockedBy: [],
    },
  ],
  headlineAnnualTotal: annual,
});

describe("buildEligibilityMapToolResult", () => {
  it("stamps the result with its sequence", () => {
    expect(buildEligibilityMapToolResult(emptyMap(3), emptyMap(2)).sequence).toBe(3);
  });

  it("declares that figures in earlier results are superseded", () => {
    const result = buildEligibilityMapToolResult(emptyMap(3), emptyMap(2));
    expect(result.supersedes).toContain("3");
    expect(result.supersedes.toLowerCase()).toContain("supersede");
  });

  it("hands the model each figure already derived, so it never has to divide", () => {
    const result = buildEligibilityMapToolResult(mapWithSnap(1, 360_000, 30_000), emptyMap(0));

    expect(result.headlineAnnualTotal).toBe("$3,600");
    expect(result.programs[0]!.annual).toBe("$3,600");
    expect(result.programs[0]!.monthly).toBe("$300");
  });

  it("passes monthly figures through rather than deriving them from the annual", () => {
    // A SNAP allotment is a monthly amount times twelve, not an annual amount
    // divided by it. When the rules module has not derived a monthly figure,
    // there is none to quote — inventing one here would put a number on screen
    // that nobody can defend (ADR-0010).
    const annualOnly: ScreeningResult = {
      ...emptyMap(1),
      programs: [
        { programId: "ct-eitc", outcome: "likely-eligible", unit: ["self"], figures: { annual: 120_000 }, blockedBy: [] },
      ],
      headlineAnnualTotal: 120_000,
    };

    const result = buildEligibilityMapToolResult(annualOnly, emptyMap(0));

    expect(result.programs[0]!.annual).toBe("$1,200");
    expect(result.programs[0]).not.toHaveProperty("monthly");
    expect(result).not.toHaveProperty("headlineMonthlyTotal");
  });

  it("quotes figures only as formatted amounts, never as raw numbers to compute on", () => {
    const payload = JSON.stringify(buildEligibilityMapToolResult(mapWithSnap(1, 360_000, 30_000), emptyMap(0)));
    expect(payload).not.toContain("360000");
    expect(payload).not.toContain("30000");
  });

  it("reports the delta from the previous map", () => {
    const result = buildEligibilityMapToolResult(mapWithSnap(2, 480_000, 40_000), mapWithSnap(1, 360_000, 30_000));

    expect(result.changeSincePreviousMap.headlineAnnualTotal).toBe("+$1,200");
    expect(result.changeSincePreviousMap.figuresChanged).toEqual([
      { programId: "snap", from: "$3,600", to: "$4,800" },
    ]);
  });

  it("reports Programs that appeared since the previous map", () => {
    const result = buildEligibilityMapToolResult(mapWithSnap(2, 360_000, 30_000), emptyMap(1));

    expect(result.changeSincePreviousMap.programsAdded).toEqual(["snap"]);
    expect(result.changeSincePreviousMap.programsRemoved).toEqual([]);
  });

  it("reports the first Program to appear as an addition, not as a special first map", () => {
    // A conversation opens on an empty map at sequence 0, so there is always a
    // previous one to compare against.
    const result = buildEligibilityMapToolResult(mapWithSnap(1, 360_000, 30_000), emptyMap(0));

    expect(result.changeSincePreviousMap.headlineAnnualTotal).toBe("+$3,600");
    expect(result.changeSincePreviousMap.programsAdded).toEqual(["snap"]);
  });

  it("reports Programs that dropped off since the previous map", () => {
    const result = buildEligibilityMapToolResult(emptyMap(2), mapWithSnap(1, 360_000, 30_000));

    expect(result.changeSincePreviousMap.programsRemoved).toEqual(["snap"]);
    expect(result.changeSincePreviousMap.headlineAnnualTotal).toBe("-$3,600");
  });

  it("ranks Blocking facts by how many Programs each one blocks", () => {
    const map: ScreeningResult = {
      ...emptyMap(1),
      blockingFacts: [
        { factId: "member-ages", blocks: ["snap", "husky-a", "care-4-kids"] },
        { factId: "monthly-rent", blocks: ["renters-rebate"] },
      ],
    };

    const result = buildEligibilityMapToolResult(map, emptyMap(0));

    expect(result.blockingFacts).toEqual([
      { factId: "member-ages", blocksPrograms: ["snap", "husky-a", "care-4-kids"], blocksCount: 3 },
      { factId: "monthly-rent", blocksPrograms: ["renters-rebate"], blocksCount: 1 },
    ]);
  });
});
