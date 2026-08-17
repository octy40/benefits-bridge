import type { HouseholdProfile } from "./types";

/**
 * Golden Household profiles.
 *
 * These are Household profiles, not a test-only shape, because they do two
 * jobs: the regression suite runs on them and the demo loads one when a live
 * conversation goes wrong on stage. A fixture kept in a test file would let the
 * fallback and the suite drift apart, and the fallback is the thing anyone
 * actually watches.
 */

/**
 * The most important regression in the suite.
 *
 * A Stamford parent with two children on about $43,000 a year, which is
 * **above** the federal 130% FPL gross test for a household of three
 * ($2,888/month) and **below** Connecticut's 200% BBCE limit ($4,442/month).
 * A screener built on the federal test turns this household away; Connecticut
 * screens them likely-eligible, and so must BenefitBridge.
 *
 * Paid hourly, with a second stream in cash — the shape that also proves an
 * hourly rate becomes money in the rules module rather than in the
 * conversation, and that cash work is captured at all.
 */
export const ctBbceBoundaryHousehold: HouseholdProfile = {
  members: [
    {
      id: "self",
      age: 34,
      relationship: "self",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [
        { type: "wages", amount: 2_000, period: "hourly", hoursPerWeek: 37 },
        { type: "cash-self-employment", amount: 40_000, period: "monthly" },
      ],
    },
    {
      id: "child-1",
      age: 9,
      relationship: "child",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [],
    },
    {
      id: "child-2",
      age: 4,
      relationship: "child",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [],
    },
  ],
  town: "Stamford",
  monthlyRent: 195_000,
};
