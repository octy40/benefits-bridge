import { describe, expect, it } from "vitest";
import * as fixtures from "@/rules/fixtures";
import { screen } from "@/rules/screen";
import type { HouseholdProfile, ProgramResult, ScreeningResult } from "@/rules/types";
import { LANGUAGES, programName } from "./copy";
import { eligibilityMapView, type MapView } from "./eligibility-map-view";

const emptyMap: ScreeningResult = {
  asOf: "2026-08-15",
  sequence: 1,
  programs: [],
  keychain: [],
  headlineAnnualTotal: 0,
  blockingFacts: [],
};

const mapOf = (entries: Partial<ScreeningResult>): ScreeningResult => ({ ...emptyMap, ...entries });

const snapWithFigure: ProgramResult = {
  programId: "snap",
  outcome: "likely-eligible",
  unit: ["self", "child-1"],
  figures: { annual: 687_600, monthly: 57_300, basis: "FY2026" },
  blockedBy: [],
};

const withSnapFigure = mapOf({ programs: [snapWithFigure], headlineAnnualTotal: 687_600 });

/** Every dollar amount anywhere in a rendered map, in reading order. */
function figuresIn(view: MapView): string[] {
  return JSON.stringify(view).match(/\$[\d,]+/g) ?? [];
}

describe("eligibilityMapView", () => {
  it("names a Program in the selected language", () => {
    expect(eligibilityMapView(withSnapFigure, "en").groups[0].withFigures[0].name).toBe(
      "SNAP food assistance",
    );
    expect(eligibilityMapView(withSnapFigure, "es").groups[0].withFigures[0].name).toBe(
      "SNAP (asistencia alimentaria)",
    );
  });

  it("carries every dollar figure through the flip unchanged", () => {
    // The headline, then SNAP's annual figure, then its monthly form — the
    // figures a Resident would read off the panel, from `money.ts` and from
    // nowhere else.
    expect(figuresIn(eligibilityMapView(withSnapFigure, "en"))).toEqual(["$6,876", "$6,876", "$573"]);
    expect(figuresIn(eligibilityMapView(withSnapFigure, "es"))).toEqual(
      figuresIn(eligibilityMapView(withSnapFigure, "en")),
    );
  });

  it("has a Resident-facing name for every Program screen can put on a map", () => {
    const onEveryGoldenHousehold = Object.values(fixtures as Record<string, HouseholdProfile>)
      .flatMap((profile) => {
        const result = screen(profile, "2026-08-15", 1);
        return [...result.programs, ...result.keychain];
      })
      .map((entry) => entry.programId);

    for (const programId of new Set(onEveryGoldenHousehold)) {
      for (const { code } of LANGUAGES) {
        // The fallback is the Program id itself, which is the rules module's
        // vocabulary and not for reading. Seeing one on screen means a Program
        // was added without a row in the translation table.
        expect(programName(programId, code)).not.toBe(programId);
      }
    }
  });

  it("keeps the Keychain in its own group, under a heading in the selected language", () => {
    const map = mapOf({
      programs: [snapWithFigure],
      keychain: [
        {
          programId: "lifeline",
          outcome: "likely-eligible",
          unit: ["self"],
          figures: { annual: 11_400, basis: "2026" },
          blockedBy: [],
        },
      ],
      headlineAnnualTotal: 699_000,
    });

    expect(eligibilityMapView(map, "en").groups.map((group) => group.heading)).toEqual([
      undefined,
      "Discounts your eligibility unlocks",
    ]);
    expect(eligibilityMapView(map, "es").groups[1].heading).toBe(
      "Descuentos que su elegibilidad le abre",
    );
    expect(eligibilityMapView(map, "es").groups[1].withFigures[0].name).toBe(
      "Lifeline (descuento de teléfono e internet)",
    );
  });

  it("names the facts a figure is still waiting on, joined the way the language joins them", () => {
    const map = mapOf({
      programs: [
        {
          programId: "snap",
          outcome: "likely-eligible",
          unit: ["self"],
          blockedBy: ["rent", "utility-costs"],
        },
      ],
    });

    expect(eligibilityMapView(map, "en").groups[0].withoutFigures[0].reason).toBe(
      "You likely qualify — tell us what you pay in rent and which utilities you pay for and this gets a figure.",
    );
    expect(eligibilityMapView(map, "es").groups[0].withoutFigures[0].reason).toBe(
      "Probablemente califica — cuéntenos cuánto paga de alquiler y qué servicios públicos paga usted y esto tendrá una cifra.",
    );
  });

  it("keeps an Indeterminate entry apart from the Programs it can place, in either language", () => {
    const map = mapOf({
      programs: [
        snapWithFigure,
        { programId: "husky-a", outcome: "indeterminate", unit: ["self"], blockedBy: [] },
      ],
      headlineAnnualTotal: 687_600,
    });

    for (const { code } of LANGUAGES) {
      const group = eligibilityMapView(map, code).groups[0];
      expect(group.withFigures.map((entry) => entry.programId)).toEqual(["snap"]);
      expect(group.withoutFigures).toEqual([]);
      expect(group.indeterminate.map((entry) => entry.programId)).toEqual(["husky-a"]);
    }

    // The reason says which fact, and says the Resident was right to keep it if
    // they did — in both languages, because a Spanish-speaking Resident is
    // exactly who this reassurance is for (ADR-0004).
    expect(eligibilityMapView(map, "es").groups[0].indeterminate[0].reason).toContain(
      "estatus migratorio",
    );
    expect(eligibilityMapView(map, "es").groups[0].indeterminateHeading).toContain("su");
  });

  it("keeps a queue's length in the sentence that explains it", () => {
    const map = mapOf({
      programs: [
        {
          programId: "care-4-kids",
          outcome: "likely-eligible",
          unit: ["child-1"],
          noFigureReason: "waitlisted",
          waitlist: { typicalWaitMonths: 8, invitingApplicationsReceivedBy: "2025-12-01" },
          blockedBy: [],
        },
      ],
    });

    for (const { code } of LANGUAGES) {
      expect(eligibilityMapView(map, code).groups[0].withoutFigures[0].reason).toContain("8");
    }
    expect(eligibilityMapView(map, "es").groups[0].withoutFigures[0].reason).toContain(
      "lista de espera",
    );
  });

  it("caveats a headline built on a proposed figure, in the selected language", () => {
    const map = mapOf({ headlineAnnualTotal: 90_000, headlineAnnualTotalProvisional: true });

    expect(eligibilityMapView(map, "en").headline.note).toContain("not yet final");
    expect(eligibilityMapView(map, "es").headline.note).toContain("no es definitiva");
    expect(eligibilityMapView(mapOf({}), "es").headline.note).not.toContain("definitiva");
  });

  it("says there is nothing on the map yet, before anything has been screened", () => {
    expect(eligibilityMapView(emptyMap, "es").empty).toContain("Todavía no hay nada que mostrar");
    expect(eligibilityMapView(withSnapFigure, "es").empty).toBeUndefined();
  });
});
