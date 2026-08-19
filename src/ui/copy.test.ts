import { describe, expect, it } from "vitest";
import { copyFor } from "./copy";

describe("the translation table", () => {
  it("joins the facts a figure is waiting on the way each language joins them", () => {
    const facts = ["cuánto paga de alquiler", "qué servicios públicos paga"];

    expect(copyFor("en").map.joinFacts(["what you pay in rent", "which utilities you pay for"])).toBe(
      "what you pay in rent and which utilities you pay for",
    );
    expect(copyFor("es").map.joinFacts(facts)).toBe(
      "cuánto paga de alquiler y qué servicios públicos paga",
    );
  });

  it("uses Spanish's other conjunction before a word that opens on the i sound", () => {
    // No blocking fact reaches this today. The rule is encoded rather than left
    // to whoever adds the phrase that needs it — anything opening on *ingresos*
    // is one row away in `FIGURE_BLOCKER_NAMES`.
    expect(copyFor("es").map.joinFacts(["cuánto paga de alquiler", "ingresos del hogar"])).toBe(
      "cuánto paga de alquiler e ingresos del hogar",
    );
    // "hielo" opens on a glide, not the i sound, so it keeps "y".
    expect(copyFor("es").map.joinFacts(["agua", "hielo"])).toBe("agua y hielo");
  });
});
