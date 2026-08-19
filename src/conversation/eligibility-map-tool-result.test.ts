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

/**
 * The status question has not been put yet unless a test says otherwise. The
 * parameter is required on the real function — a caller who forgot it would
 * offer the one optional question twice (ADR-0004) — so the default lives here
 * rather than there.
 */
const build = (current: ScreeningResult, previous: ScreeningResult, alreadyOffered = false) =>
  buildEligibilityMapToolResult(current, previous, alreadyOffered);

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
    expect(build(emptyMap(3), emptyMap(2)).sequence).toBe(3);
  });

  it("declares that figures in earlier results are superseded", () => {
    const result = build(emptyMap(3), emptyMap(2));
    expect(result.supersedes).toContain("3");
    expect(result.supersedes.toLowerCase()).toContain("supersede");
  });

  it("hands the model each figure already derived, so it never has to divide", () => {
    const result = build(mapWithSnap(1, 360_000, 30_000), emptyMap(0));

    expect(result.headlineAnnualTotal).toBe("$3,600");
    expect(result.programs[0]!.annual).toBe("$3,600");
    expect(result.programs[0]!.monthly).toBe("$300");
  });

  it("names the period a figure was published for, alongside the figure", () => {
    const labelled: ScreeningResult = {
      ...mapWithSnap(1, 687_600, 57_300),
      programs: [
        {
          programId: "snap",
          outcome: "likely-eligible",
          unit: ["self"],
          figures: {
            annual: 687_600,
            monthly: 57_300,
            basis: "FY2026 figures (October 2025 – September 2026)",
          },
          blockedBy: [],
        },
      ],
    };

    // So a Resident asking "is that this year's number?" gets an answer the
    // model transcribes rather than one it recalls.
    expect(build(labelled, emptyMap(0)).programs[0]!.figuresBasis).toBe(
      "FY2026 figures (October 2025 – September 2026)",
    );
  });

  it("flags a figure the issuing agency has not finalised, so the model says 'proposed'", () => {
    // CEAP's FFY2027 season, as of this research: the fact sheet itself calls
    // the amounts proposed. The model must be told directly rather than left
    // to infer it from the basis string (ADR-0010).
    const proposed: ScreeningResult = {
      ...emptyMap(1),
      programs: [
        {
          programId: "ceap",
          outcome: "likely-eligible",
          unit: ["self"],
          figures: { annual: 84_500, basis: "2026-27 heating season — proposed, not final", provisional: true },
          blockedBy: [],
        },
      ],
      headlineAnnualTotal: 84_500,
    };

    expect(build(proposed, emptyMap(0)).programs[0]!.provisional).toBe(true);
  });

  it("omits the provisional flag for a finalised figure", () => {
    expect(build(mapWithSnap(1, 360_000, 30_000), emptyMap(0)).programs[0]).not.toHaveProperty("provisional");
  });

  it("flags the headline total when it includes a provisional figure", () => {
    const withProvisionalHeadline: ScreeningResult = {
      ...emptyMap(1),
      headlineAnnualTotal: 84_500,
      headlineAnnualTotalProvisional: true,
    };

    expect(build(withProvisionalHeadline, emptyMap(0)).headlineAnnualTotalProvisional).toBe(true);
    expect(build(emptyMap(1), emptyMap(0))).not.toHaveProperty("headlineAnnualTotalProvisional");
  });

  it("shows an entry that is scored but still waiting on a figure", () => {
    // SNAP knows a household is likely eligible before it knows their rent. The
    // model has to be able to say so — and must not be handed a figure for it.
    const tierTwo: ScreeningResult = {
      ...emptyMap(1),
      programs: [
        { programId: "snap", outcome: "likely-eligible", unit: ["self"], blockedBy: ["rent"] },
      ],
    };

    const entry = build(tierTwo, emptyMap(0)).programs[0]!;

    expect(entry.outcome).toBe("likely-eligible");
    expect(entry.blockedBy).toEqual(["rent"]);
    expect(entry).not.toHaveProperty("annual");
    expect(entry).not.toHaveProperty("monthly");
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

    const result = build(annualOnly, emptyMap(0));

    expect(result.programs[0]!.annual).toBe("$1,200");
    expect(result.programs[0]).not.toHaveProperty("monthly");
    expect(result).not.toHaveProperty("headlineMonthlyTotal");
  });

  it("quotes figures only as formatted amounts, never as raw numbers to compute on", () => {
    const payload = JSON.stringify(build(mapWithSnap(1, 360_000, 30_000), emptyMap(0)));
    expect(payload).not.toContain("360000");
    expect(payload).not.toContain("30000");
  });

  it("reports the delta from the previous map", () => {
    const result = build(mapWithSnap(2, 480_000, 40_000), mapWithSnap(1, 360_000, 30_000));

    expect(result.changeSincePreviousMap.headlineAnnualTotal).toBe("+$1,200");
    expect(result.changeSincePreviousMap.figuresChanged).toEqual([
      { programId: "snap", from: "$3,600", to: "$4,800" },
    ]);
  });

  it("reports Programs that appeared since the previous map", () => {
    const result = build(mapWithSnap(2, 360_000, 30_000), emptyMap(1));

    expect(result.changeSincePreviousMap.programsAdded).toEqual(["snap"]);
    expect(result.changeSincePreviousMap.programsRemoved).toEqual([]);
  });

  it("reports the first Program to appear as an addition, not as a special first map", () => {
    // A conversation opens on an empty map at sequence 0, so there is always a
    // previous one to compare against.
    const result = build(mapWithSnap(1, 360_000, 30_000), emptyMap(0));

    expect(result.changeSincePreviousMap.headlineAnnualTotal).toBe("+$3,600");
    expect(result.changeSincePreviousMap.programsAdded).toEqual(["snap"]);
  });

  it("reports Programs that dropped off since the previous map", () => {
    const result = build(emptyMap(2), mapWithSnap(1, 360_000, 30_000));

    expect(result.changeSincePreviousMap.programsRemoved).toEqual(["snap"]);
    expect(result.changeSincePreviousMap.headlineAnnualTotal).toBe("-$3,600");
  });

  it("carries the optional status question, with the rules for asking it attached", () => {
    // The rule travels with the field for the same reason `supersedes` does:
    // an instruction the model has to remember across a long conversation
    // decays, and one restated by every result it applies to does not.
    const open: ScreeningResult = { ...emptyMap(1), statusQuestion: { blocks: ["snap"] } };

    const result = build(open, emptyMap(0));

    expect(result.statusQuestion!.blocksPrograms).toEqual(["snap"]);
    expect(result.statusQuestion!.howToAsk).toContain("decline");
    expect(result.statusQuestion!.howToAsk).toContain("immigrationStatus");
  });

  it("drops the status question once the conversation has already put it", () => {
    // "Asked at most once" is structural rather than a thing the model is
    // trusted to remember: the field simply stops arriving (ADR-0004). It holds
    // even when no answer was recorded, which is exactly the case the model
    // cannot be relied on for.
    const open: ScreeningResult = { ...emptyMap(1), statusQuestion: { blocks: ["snap"] } };

    expect(build(open, emptyMap(0), true)).not.toHaveProperty("statusQuestion");
  });

  it("shows an entry BenefitBridge cannot put either way, with no figure on it", () => {
    const indeterminate: ScreeningResult = {
      ...emptyMap(1),
      programs: [{ programId: "snap", outcome: "indeterminate", unit: ["self"], blockedBy: [] }],
    };

    const entry = build(indeterminate, emptyMap(0)).programs[0]!;

    expect(entry.outcome).toBe("indeterminate");
    expect(entry).not.toHaveProperty("annual");
    // It appears under `programsAdded`, which is why the prompt has to say what
    // an indeterminate entry means: on its own it reads to the model as a gain.
    expect(build(indeterminate, emptyMap(0)).changeSincePreviousMap.programsAdded).toEqual(["snap"]);
    expect(build(indeterminate, emptyMap(0)).headlineAnnualTotal).toBe("$0");
  });

  it("ranks Blocking facts by how many Programs each one blocks", () => {
    const map: ScreeningResult = {
      ...emptyMap(1),
      blockingFacts: [
        { factId: "income-sources", blocks: ["snap", "husky-a", "care-4-kids"] },
        { factId: "work-hours", blocks: ["snap"] },
      ],
    };

    const result = build(map, emptyMap(0));

    expect(result.blockingFacts).toEqual([
      { factId: "income-sources", blocksPrograms: ["snap", "husky-a", "care-4-kids"], blocksCount: 3 },
      { factId: "work-hours", blocksPrograms: ["snap"], blocksCount: 1 },
    ]);
  });
});
