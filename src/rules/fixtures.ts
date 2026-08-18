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
  // No `utilitiesPaid`: this fixture is the *outcome* regression and is
  // deliberately left one fact short of a figure, so the suite keeps an example
  // of an entry that is scored but still in tier 2. Maria below is the one that
  // carries a dollar amount.
};

/**
 * "Maria before her mother" — the household the demo opens on, and the first
 * one BenefitBridge puts a dollar figure on.
 *
 * A single parent in Stamford with two children, nine and four, renting at
 * $1,600 a month and paying her own heat. She earns about $24,900 a year:
 * $18.00 an hour for 24 hours a week, plus $200 a month in cash. The cash is
 * the point — it is countable earned income for SNAP and self-employment
 * income for EITC, and a screener that asked "what is your annual income?"
 * would have lost it (ADR-0009).
 *
 * She pays a heating bill, which in a mandatory-SUA state means the $976
 * Standard Utility Allowance rather than her actual bills — and $1,600 of rent
 * plus $976 of allowance puts her far enough above half her adjusted income
 * that the excess shelter deduction is pinned at its $744 cap.
 *
 * The name is a promise about a second fixture. When her mother moves in, the
 * unit grows to four, a Social Security stream arrives, and — because the
 * household then contains an elderly member — the $744 cap comes off entirely.
 * That is the household change the demo turns on, and it is issue #17's scope
 * (gated on #10), not this fixture's: nothing here records disability or acts
 * on age.
 */
export const mariaBeforeHerMother: HouseholdProfile = {
  members: [
    {
      id: "self",
      age: 31,
      relationship: "self",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [
        { type: "wages", amount: 1_800, period: "hourly", hoursPerWeek: 24 },
        { type: "cash-self-employment", amount: 20_000, period: "monthly" },
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
  monthlyRent: 160_000,
  utilitiesPaid: ["heat", "electricity"],
};

/**
 * Maria, having been asked about immigration status and declined.
 *
 * The same household as `mariaBeforeHerMother` in every other respect, which is
 * the point: it is the pair, not this fixture alone, that shows what the coarse
 * implementation does. Unasked, this household is likely eligible for $573 a
 * month and the headline says $6,876 a year. Declined, SNAP is Indeterminate,
 * carries no figure, and the headline is $0 — because `headlineTotal` sums only
 * likely-eligible entries, which is what stops an entry BenefitBridge cannot
 * put either way from being counted as money owed.
 *
 * That drop is also the honest measure of what declining costs on today's
 * Program list, and it is close to everything. ADR-0004 (as amended) records
 * why: four of the five status-dependent Programs BenefitBridge means to screen
 * are, in law, available to a mixed-status family with citizen children, and
 * the household-level question cannot see that.
 *
 * **What this fixture cannot yet demonstrate, named rather than faked.** The
 * ticket asks that status-blind Programs still be scored and the headline still
 * be produced from them. SNAP is the only implemented Program and it is
 * status-dependent, so there is no "the rest" and the correct headline here is
 * $0. The only genuinely status-blind Program on BenefitBridge's list is the CT
 * Elderly/Disabled Renters' Rebate (`docs/ct-program-facts.md` §6, §8), which
 * belongs to issue #17 and is blocked behind issue #10. When it lands, this
 * fixture should assert a non-zero headline built from it alongside an
 * Indeterminate SNAP. A stub Program added here to make that assertion pass
 * today would be worse than the gap — `fixtures.ts` exists so the demo and the
 * suite cannot drift, and a fake Program drifts them both from reality.
 */
export const declinedStatusHousehold: HouseholdProfile = {
  ...mariaBeforeHerMother,
  immigrationStatus: "declined",
};

/**
 * The case that proves the product's thesis in the government's own words: a
 * household already receiving SNAP is categorically income-eligible for CEAP
 * without proving income again (`docs/ct-program-facts.md` §4; issue #19).
 *
 * A single parent and her five-year-old, in Stamford, already on SNAP —
 * `programsAlreadyReceived` carries that — and nothing else about the
 * household has been said yet. Neither member's `incomeSources` has been
 * asked for, and CEAP still scores `likely-eligible` from that one recorded
 * fact alone. SNAP itself gets no such shortcut: `screenSnap` never reads
 * `programsAlreadyReceived`, so it stays off the map pending the food-sharing
 * and income facts it always needs, which is the contrast this fixture is
 * built to show side by side with the same conversation turn.
 *
 * The figure is still tier 2: CEAP's dollar amount needs the income CEAP's
 * *eligibility* just did without, plus whether the household rents. The
 * child's age already settles vulnerability (under 6), so `disability` is
 * never on the agenda for this household at all.
 */
export const ceapCategoricalHousehold: HouseholdProfile = {
  members: [
    { id: "self", age: 29, relationship: "self", sharesFoodPurchaseAndPreparation: true },
    { id: "child-1", age: 5, relationship: "child", sharesFoodPurchaseAndPreparation: true },
  ],
  town: "Stamford",
  programsAlreadyReceived: ["snap"],
};
