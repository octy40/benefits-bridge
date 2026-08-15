import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyDelta } from "./money";

describe("formatMoney", () => {
  it("renders cents as whole dollars, rounded to the nearest", () => {
    expect(formatMoney(0)).toBe("$0");
    expect(formatMoney(360_000)).toBe("$3,600");
    expect(formatMoney(120_449)).toBe("$1,204");
    expect(formatMoney(120_450)).toBe("$1,205");
  });

  it("keeps the sign on a negative figure", () => {
    // The renters' rebate pays nothing when 35% of rent and utilities falls
    // below 5% of qualifying income. A negative figure quoted to a Resident as
    // a positive one is money they will go to an office expecting.
    expect(formatMoney(-360_000)).toBe("-$3,600");
  });
});

describe("formatMoneyDelta", () => {
  it("marks movement rather than restating a total", () => {
    expect(formatMoneyDelta(120_000)).toBe("+$1,200");
    expect(formatMoneyDelta(-120_000)).toBe("-$1,200");
  });

  it("says so plainly when nothing moved", () => {
    expect(formatMoneyDelta(0)).toBe("no change");
  });
});
