import { describe, expect, it } from "vitest";
import { mariaAfterHerMother, mariaBeforeHerMother } from "@/rules/fixtures";
import { screen } from "@/rules/screen";
import { emptyHouseholdProfile } from "@/rules/types";
import { eligibilityMapView } from "./eligibility-map-view";
import { mapChanges } from "./map-change";

const ASOF = "2026-08-15";

const before = screen(mariaBeforeHerMother, ASOF, 1);
const after = screen(mariaAfterHerMother, ASOF, 2);

describe("mapChanges", () => {
  /**
   * The demo's central beat, read off two `ScreeningResult`s: her mother moves
   * in, the renters' rebate appears, and SNAP's figure moves. Two entries
   * change and the other five do not, which is the whole reason the panel can
   * show a Resident *which* line moved (ADR-0007).
   */
  it("marks the Program that appeared and the Program whose figure moved, and nothing else", () => {
    expect([...mapChanges(after, before)]).toEqual([
      ["snap", "figure-changed"],
      ["renters-rebate", "added"],
    ]);
  });

  it("marks nothing when there is no previous map to read against", () => {
    expect([...mapChanges(after, undefined)]).toEqual([]);
  });

  it("marks nothing when the same map is rendered again", () => {
    expect([...mapChanges(after, after)]).toEqual([]);
  });

  /**
   * A conversation opens on an empty map at sequence 0, so the first Program to
   * be scored arrives as an addition rather than as a special case — the same
   * path `eligibility-map-tool-result.ts` relies on for the model.
   */
  it("reads the first scored map against the empty one a conversation opens on", () => {
    const opening = screen(emptyHouseholdProfile(), ASOF, 0);

    expect([...mapChanges(before, opening)].map(([programId]) => programId)).toEqual([
      "snap",
      "ceap",
      "husky-a",
      "care-4-kids",
      "lifeline",
      "lidr",
    ]);
  });

  /**
   * An entry the household is likely ineligible for is not on the map at all
   * (`eligibility-map-view.ts` filters it), so crossing into eligibility has to
   * read as an arrival rather than as a figure appearing on something already
   * there.
   */
  it("treats a Program crossing out of likely-ineligible as an arrival", () => {
    const ineligible = {
      ...before,
      programs: before.programs.map((entry) =>
        entry.programId === "snap"
          ? { ...entry, outcome: "likely-ineligible" as const, figures: undefined }
          : entry,
      ),
    };

    expect(mapChanges(before, ineligible).get("snap")).toBe("added");
  });
});

describe("eligibilityMapView, rendering the change", () => {
  it("badges the entries that moved, in the selected language, and leaves the rest unbadged", () => {
    const view = eligibilityMapView(after, "en", before);
    const badges = view.groups[0].withFigures.map((entry) => [entry.programId, entry.change]);

    expect(badges).toEqual([
      ["snap", "Updated"],
      ["ceap", undefined],
      ["renters-rebate", "New"],
    ]);

    expect(
      eligibilityMapView(after, "es", before).groups[0].withFigures.map((entry) => entry.change),
    ).toEqual(["Actualizado", undefined, "Nuevo"]);
  });

  /**
   * ADR-0013's rule holds for the delta as much as for the totals: the amount
   * is `money.ts`'s and the sentence around it is the translation table's, so
   * the figure is byte-identical in both languages.
   */
  it("says how far the headline moved, with the amount identical in either language", () => {
    expect(eligibilityMapView(after, "en", before).headline.change).toBe(
      "+$2,140 since your last answer",
    );
    expect(eligibilityMapView(after, "es", before).headline.change).toBe(
      "+$2,140 desde su última respuesta",
    );
  });

  /**
   * `formatMoneyDelta` renders a standstill as the English words "no change",
   * and there is no row for those anywhere in the translation table. A headline
   * that held still therefore gets no line at all, which is both the honest
   * rendering and the only one that cannot leak English onto a Spanish panel.
   */
  it("says nothing about a headline that did not move", () => {
    expect(eligibilityMapView(after, "en", after).headline.change).toBeUndefined();
    expect(eligibilityMapView(after, "en").headline.change).toBeUndefined();
  });

  it("badges an entry that has no figure to change, like a waitlisted Program arriving", () => {
    const opening = screen(emptyHouseholdProfile(), ASOF, 0);
    const view = eligibilityMapView(before, "en", opening);

    expect(view.groups[0].withoutFigures.map((entry) => [entry.programId, entry.change])).toEqual([
      ["husky-a", "New"],
      ["care-4-kids", "New"],
    ]);
  });
});
