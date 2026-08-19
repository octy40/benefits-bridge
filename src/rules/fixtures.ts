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
 * The name is a promise about a second fixture, and `mariaAfterHerMother` below
 * keeps it. When her mother moves in the unit grows to four, a Social Security
 * stream arrives, and — because the household then contains an elderly member —
 * the $744 cap comes off entirely. This household is the *before* half of that
 * pair and nothing in it records disability or is old enough to act on age, so
 * its own SNAP figure is computed with the cap on.
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
 * "Maria after her mother" — the household the demo turns on, and the one
 * fixture in this file that asserts two consequences of a single fact.
 *
 * `mariaBeforeHerMother` with one member added: her mother, 71, on $950 a month
 * of Social Security, who buys and prepares food with them. Nothing else about
 * the household changes — same rent, same heating bill, same wages, same cash.
 *
 * Two things move, and only one of them is the one anybody would script
 * (ADR-0007):
 *
 *  - **the renters' rebate appears**, because the mother is 65 or over and
 *    rents. It derives its own Program unit — her, not the household — and its
 *    own definition of income, which counts her Social Security in full where
 *    SNAP counts it as unearned and the EITC would ignore it (ADR-0003,
 *    ADR-0009). Two adults share the apartment, so she is credited with half
 *    the rent: 35% of $9,600 less 5% of $11,400 is $2,790, over the $700
 *    maximum, so she gets $700;
 *  - **SNAP's existing figure moves**, from $573 a month to $693, because a
 *    member aged 60 or over removes the excess shelter deduction cap entirely
 *    (7 CFR 273.9(d)(6)(ii); verified for Connecticut in issue #10). Her
 *    arrival also grows the unit to four and adds her income to it, so the
 *    figure is not simply the old one plus the cap — all three changes land at
 *    once, which is what a script could not have produced.
 *
 * Nothing in the rules module knows this household by name. Both consequences
 * fall out of a member with an age and an income source being added to a list,
 * which is the claim ADR-0007 makes and the reason there is no trigger here to
 * find.
 */
export const mariaAfterHerMother: HouseholdProfile = {
  ...mariaBeforeHerMother,
  members: [
    ...mariaBeforeHerMother.members,
    {
      id: "mother",
      age: 71,
      relationship: "mother",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [{ type: "social-security", amount: 95_000, period: "monthly" }],
    },
  ],
};

/**
 * The renters' rebate case that produces nothing, and has to say so.
 *
 * A 74-year-old renting a room in Stamford for $500 a month on $43,200 a year —
 * $2,100 of Social Security and $1,500 of pension income, monthly. She is
 * comfortably under the rebate's $46,300 qualifying income limit, so an income
 * test alone would put her on the map. The computation does not: 35% of her
 * $6,000 of annual rent is $2,100 and 5% of her qualifying income is $2,160, so
 * the grant is negative and Connecticut sends no check at all (OPM Q&A booklet
 * Q57, form M-35r line 15).
 *
 * Her Social Security is what decides it. On the pension alone her qualifying
 * income would be $18,000, 5% of that is $900, and she would have a rebate — so
 * this one fixture carries both the "counts Social Security in full" rule and
 * the "nothing, not a spurious figure" rule, and neither can be broken without
 * the other's assertion noticing.
 *
 * SNAP has nothing for her either, on income: $3,600 a month is over
 * Connecticut's $2,609 limit for a unit of one.
 */
export const rebateComputesToNothingHousehold: HouseholdProfile = {
  members: [
    {
      id: "self",
      age: 74,
      relationship: "self",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [
        { type: "social-security", amount: 210_000, period: "monthly" },
        { type: "other", amount: 150_000, period: "monthly" },
      ],
    },
  ],
  town: "Stamford",
  monthlyRent: 50_000,
  utilitiesPaid: [],
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
 * **Where the status-blind half of the claim is actually demonstrated.** The
 * ticket behind this fixture asked that status-blind Programs still be scored
 * and a headline still be produced from them. Every Program this *household*
 * reaches is status-dependent, so its Programs are all Indeterminate and the
 * only thing holding its headline up is the Keychain. The genuinely
 * status-blind Program on BenefitBridge's list is the CT Elderly/Disabled
 * Renters' Rebate (`docs/ct-program-facts.md` §6, §8), and it needs a member 65
 * or over, which this household does not have. `mariaAfterHerMother` does:
 * declining on that household leaves every Program Indeterminate *except* the
 * rebate, which keeps its $700 and its place in the headline. That pair is
 * where `screen.test.ts` asserts the claim, and this fixture stays the plain
 * measure of what declining costs a household the rebate cannot reach.
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

/**
 * The case a Keychain lookup keyed off SNAP would have broken (issue #21).
 *
 * A single Stamford resident earning $40,000 a year — over Connecticut's SNAP
 * limit for a household of one ($31,308/year, 200% BBCE) and never having
 * received SNAP, so a Lifeline or utility Low-Income Discount Rate screened
 * only off SNAP participation would come back with nothing. The utility
 * discount rate's own income test reaches further: $40,000 clears its 15%
 * tier ceiling ($33,676) and lands under its 5% tier ceiling ($48,714, 60%
 * State Median Income for the FFY2027 season DSS has already priced the
 * utility's live table from) — likely-eligible at the loosest tier on income
 * alone, with nobody's participation in anything else in play.
 *
 * Lifeline's own income route (135% FPL, $21,546 for a household of one) does
 * not reach this far, so it screens `likely-ineligible` here — the fixture is
 * deliberately built so only one Keychain entry carries the case, not both.
 */
export const lidrIncomeOnlyHousehold: HouseholdProfile = {
  members: [
    {
      id: "self",
      age: 40,
      relationship: "self",
      incomeSources: [{ type: "wages", amount: 4_000_000, period: "annual" }],
    },
  ],
  town: "Stamford",
};

/**
 * Denise, alone. $1,500 a month is under HUSKY D's 138% FPL line for a
 * household of one ($1,836) — a Program with no figure and no dependent child
 * in the home to route her to HUSKY A instead (`docs/ct-program-facts.md`
 * §2). Paired with `deniseWithHerSon` below: same income, same 138% line,
 * different Program — the ticket's headline claim made concrete rather than
 * only asserted in a code comment.
 */
export const deniseAlone: HouseholdProfile = {
  members: [
    {
      id: "denise",
      age: 40,
      relationship: "self",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [{ type: "wages", amount: 150_000, period: "monthly" }],
    },
  ],
  town: "Stamford",
};

/**
 * Denise, with her eight-year-old. Identical income to `deniseAlone` and the
 * identical 138% FPL test — but a household of two now, and a dependent child
 * in the home routes her to HUSKY A's parent/caretaker line instead of HUSKY
 * D's, per `docs/ct-program-facts.md` §2: "The distinguishing fact is
 * household composition (dependent child in the home), not income." Her son
 * clears HUSKY A's own 201% children's line by an even wider margin, so both
 * of them land in the unit.
 */
export const deniseWithHerSon: HouseholdProfile = {
  members: [
    {
      id: "denise",
      age: 40,
      relationship: "self",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [{ type: "wages", amount: 150_000, period: "monthly" }],
    },
    {
      id: "son",
      age: 8,
      relationship: "child",
      sharesFoodPurchaseAndPreparation: true,
      incomeSources: [],
    },
  ],
  town: "Stamford",
};
