import { inForceOn, type EffectiveDated } from "../effective-dated";
import { incomeBlockedBy, monthlyTotal } from "../income";
import type { ProgramRule } from "../program-rule";
import type { Member, Money, ProgramId } from "../types";

export const RENTERS_REBATE: ProgramId = "renters-rebate";

type RebateFigures = {
  /** How the program year is named wherever a figure derived from this row is quoted. */
  basis: string;
  /** Ceiling on qualifying income for the program year. Above it, no grant at all. */
  qualifyingIncomeLimit: Money;
  /** The largest grant the income table can allow. See the caveat on `RENTERS_REBATE_FIGURES`. */
  maximumGrant: Money;
  /** A proportion: the share of rent and utilities the grant is computed from. */
  shareOfRentAndUtilities: number;
  /** A proportion: the share of qualifying income subtracted from it. */
  shareOfQualifyingIncome: number;
  /** Below this the state issues no check at all, so BenefitBridge shows no figure. */
  minimumPayable: Money;
};

/**
 * The 2026 program year of the CT Elderly/Disabled Renters' Rebate, which
 * refunds part of the **2025** calendar year's rent and utilities.
 *
 * Administered by OPM, taken by the municipality — in Stamford by the
 * Department of Health and Human Services, Division of Housing Services
 * (`docs/ct-program-facts.md` §6).
 *
 * The row is dated to the **application window**, 1 April – 30 September 2026,
 * rather than to the calendar year, and that is a deliberate difference from
 * every other table in this module. The others close when their figures expire;
 * this one closes when the thing it prices stops existing. OPM's own page says
 * the window admits "no extensions", and the next program year's income limits
 * are not published until OPM distributes them to assessors in December, so
 * outside these dates there is neither a grant to apply for nor a table to
 * price one from. Quoting a figure on 1 October would be quoting a grant
 * nobody can currently claim.
 *
 * Sources, both carrying the same figures:
 *  - OPM Renters' Rebate program page
 *    https://portal.ct.gov/opm/igpp/grants/tax-relief-grants/renters--rebate-for-elderly-disabled-renters-tax-relief-program
 *  - OPM Renters' Tax Relief Q&A booklet, 2026 edition, Q49 (the income limits)
 *    and Q56 (the computation)
 *    https://portal.ct.gov/opm/-/media/opm/igpp-data-grants-mgmt/q-and-a-tax-relief-booklets/renters-rebate-qa-booklet.pdf
 *
 * **The one figure here that is not defensible for every household, stated
 * plainly rather than buried.** CGS §12-170e does not set a single maximum: it
 * sets a *graduated* table of four bands for an unmarried applicant, whose
 * maximum grant falls $700 → $500 → $250 → $150 as qualifying income rises,
 * each band also carrying a *minimum* grant ($300 → $200 → $100 → $50) that
 * form M-35r line 19 applies **upward**. The statute adjusts the band
 * boundaries every year by the Social Security COLA, rounded to the nearest
 * $100, and OPM distributes the adjusted table to municipal assessors by 31
 * December — it is not published on OPM's site, is not in the Q&A booklet, and
 * is not on form M-35r, all three of which say only "amount per table". Only
 * the top of the last band ($46,300) and the first band's maximum ($700) are
 * published.
 *
 * So `maximumGrant` here is the *first band's* maximum applied across the whole
 * income range. The two errors that creates run in opposite directions and both
 * are real:
 *  - it **overstates** the grant for an applicant in an upper band, who may be
 *    entitled to $150 where this quotes up to $700. This is the wrong direction
 *    for a figure that has to be defensible, and it is the reason to get the
 *    real table;
 *  - it **understates** the grant for an applicant whose computed amount falls
 *    below their band's minimum, since that upward floor is not implemented
 *    either.
 *
 * Getting OPM's 2026 table — from OPM directly or from a Connecticut
 * assessor's office — turns `maximumGrant` into a banded table and is a data
 * change, not a code change: `maximumGrantFor` below is the only line that
 * would move. Until then this Program's figure is the least well-evidenced one
 * BenefitBridge shows.
 */
const RENTERS_REBATE_FIGURES: EffectiveDated<RebateFigures>[] = [
  {
    effectiveFrom: "2026-04-01",
    effectiveTo: "2026-09-30",
    value: {
      basis: "2026 program year (2025 rent and income)",
      // Unmarried. BenefitBridge screens every applicant as unmarried — see
      // `qualifyingApplicants` — so the married limit ($56,500) has no row.
      qualifyingIncomeLimit: 4_630_000,
      maximumGrant: 70_000,
      // 35% of rent and utilities, less 5% of qualifying income — CGS
      // §12-170d/§12-170e, form M-35r lines 13 and 14.
      shareOfRentAndUtilities: 0.35,
      shareOfQualifyingIncome: 0.05,
      // "If the check is not $10.00 or more it will not be sent" — Q&A booklet,
      // Basic Information (4).
      minimumPayable: 1_000,
    },
  },
];

/**
 * The renters' rebate is the one Program on BenefitBridge's list that is
 * **genuinely status-blind**, and so the one that does not pass through
 * `statusDependent`.
 *
 * That is a finding rather than an omission: `docs/ct-program-facts.md` §8
 * records that OPM's stated eligibility is age, disability, one-year state
 * residency and income, and that the full text of the 2026 Q&A booklet was
 * searched for *citizen / immigrat / alien* with zero hits. A household that
 * declines the one optional question (ADR-0004) still gets a figure here, which
 * is the whole reason declining is offered as a real choice rather than a
 * dead end.
 */
export const screenRentersRebate: ProgramRule = (profile, asOf) => {
  const figures = inForceOn(RENTERS_REBATE_FIGURES, asOf);

  // Outside the application window there is no grant to screen for. Nothing the
  // Resident could say would change that, so this blocks no facts.
  if (!figures) return { programId: RENTERS_REBATE, blockedBy: [] };

  if (profile.members.length === 0) {
    return { programId: RENTERS_REBATE, blockedBy: ["household-members"] };
  }

  const applicants = qualifyingApplicants(profile.members);

  // Nobody in this household can apply. Age is not a Blocking fact anywhere in
  // this module and disability is deliberately not one *here* — see
  // `qualifyingApplicants` — so the rebate is simply not on the map, exactly as
  // Care 4 Kids is for a household with no qualifying child.
  if (applicants.length === 0) return { programId: RENTERS_REBATE, blockedBy: [] };

  // Only the applicants' own income is qualifying income. The rest of the
  // household's is irrelevant to this Program and counted in full by SNAP —
  // the same fact required by one Program and not another, which is ADR-0003
  // paying for itself a second time.
  const blockedBy = incomeBlockedBy(applicants);
  if (blockedBy.length > 0) return { programId: RENTERS_REBATE, blockedBy };

  const unit = applicants.map((applicant) => applicant.id);

  // The income limit is each applicant's own, not the household's — they file
  // separate applications and are tested separately (Q&A booklet Q11: "Only
  // married couples' names may appear on one application"). Summing two
  // applicants' incomes and testing that would fail a pair who are each
  // comfortably under, which is exactly the household-shaped mistake ADR-0003
  // exists to prevent.
  const withinLimit = applicants.filter(
    (applicant) => qualifyingIncomeOf([applicant]) <= figures.qualifyingIncomeLimit,
  );

  // Nobody left who could be paid, and that is settled without knowing anything
  // about rent — so this household is never asked what it pays on the rebate's
  // account. The unit still names everyone the Program counted, over the limit
  // or not: it reports who was screened, not who won.
  if (withinLimit.length === 0) {
    return {
      programId: RENTERS_REBATE,
      blockedBy: [],
      result: { programId: RENTERS_REBATE, outcome: "likely-ineligible", unit, blockedBy: [] },
    };
  }

  // Rent gates the *outcome* here, unlike SNAP where it only gates the figure.
  // A qualifying applicant under the income limit still receives nothing when
  // 35% of their share of the rent falls below 5% of their income (Q57), so
  // until rent is known there is no outcome to report — and a Program with an
  // unknown outcome is one BenefitBridge leaves off the map rather than guesses
  // at (`program-rule.ts`).
  const { monthlyRent } = profile;
  if (monthlyRent === undefined) return { programId: RENTERS_REBATE, blockedBy: ["rent"] };

  // Proration counts everyone sharing the apartment, not just the applicants —
  // a housemate who qualifies for nothing still reduces what each applicant is
  // credited with (Q&A booklet Q11).
  const share = sharedOccupancyShare(profile.members);
  const annual = grantFor(withinLimit, monthlyRent, share, figures);

  // Below the minimum payable the state sends no check. Reported
  // likely-ineligible so the entry leaves the map altogether rather than
  // sitting in tier 1 at $0 — the same call `programs/snap.ts` makes for an
  // allotment that computes to nothing, and the case Q57 exists to describe.
  if (annual === undefined) {
    return {
      programId: RENTERS_REBATE,
      blockedBy: [],
      result: { programId: RENTERS_REBATE, outcome: "likely-ineligible", unit, blockedBy: [] },
    };
  }

  return {
    programId: RENTERS_REBATE,
    blockedBy: [],
    result: {
      programId: RENTERS_REBATE,
      outcome: "likely-eligible",
      unit,
      // Annual and nothing else. The rebate is a single yearly check, and a
      // monthly figure divided out of it would be a number nobody can defend
      // (ADR-0010).
      figures: { annual, basis: figures.basis },
      blockedBy: [],
    },
  };
};

/**
 * The rebate's Program unit: the people in this household who could file an
 * application. Not the household, and — in the case this product was built
 * around — not the Resident having the conversation but her mother (ADR-0003).
 *
 * Age 65 or over, or 18 or over and receiving Social Security Disability
 * (`docs/ct-program-facts.md` §6). `hasDisability` stands in for the latter,
 * the same approximation `programs/care-4-kids.ts` makes of the agency's own
 * "special needs" category.
 *
 * **`hasDisability` being unknown deliberately blocks nothing here**, and that
 * is a different call from the one `programs/ceap.ts` and
 * `programs/care-4-kids.ts` make with the same field. For them the question is
 * decisive only for a narrow band of ages — a member 13 to 18, a household with
 * nobody 60+ and no child under 6 — so asking it is rare and pointed. Here it
 * would decide something for *every adult under 65*, which is nearly every
 * household BenefitBridge screens, and a fact that gets asked of everybody to
 * settle almost nobody is the asymmetry `isPregnant` is kept off the Blocking
 * facts list for (`types.ts`). It is read when it is there and never chased.
 * A household is still asked about disability whenever CEAP needs it, and this
 * Program picks up the answer for free when it lands.
 *
 * Two eligibility routes are **not** modelled, named so a reader does not go
 * looking: the 50-or-over surviving spouse of a previously qualified renter,
 * which turns on a fact about a dead person that no conversation here elicits,
 * and the one-year Connecticut residency requirement, which the Household
 * profile has no field for. Both narrow real eligibility; neither is checked,
 * so this screen is loose in the direction of showing the Program to a
 * household that would be turned away at the counter.
 *
 * Every applicant is screened as **unmarried**, because `relationship` is free
 * text and `programs/care-4-kids.ts` already established that this module does
 * not read roles out of it. Both halves of that approximation understate: the
 * unmarried maximum grant is $700 against a married couple's $900, and a
 * married couple counted as two sharing adults rather than the one tenant
 * §12-170d makes them halves the rent each is credited with.
 */
function qualifyingApplicants(members: Member[]): Member[] {
  return members.filter(
    (member) =>
      member.age !== undefined &&
      (member.age >= 65 || (member.age >= 18 && member.hasDisability === true)),
  );
}

/**
 * The share of the apartment's rent one applicant is credited with.
 *
 * "Each adult (18 and older) should be considered as a sharing participant
 * regardless of their income and regardless of who actually pays the expenses"
 * — Q&A booklet Q11, with Q58 giving the worked case: 50% each where two adults
 * live in the apartment. §12-170d assumes the split rather than asking who paid,
 * which is why this is derived from the Household profile and never elicited.
 *
 * A member whose age nobody has recorded counts as a sharing adult. That is the
 * understating choice — one more sharer means a smaller share each — and it is
 * the right way round for a figure that has to be defensible, where assuming a
 * household is smaller than it is would inflate every applicant's grant.
 */
function sharedOccupancyShare(members: Member[]): number {
  const sharers = members.filter((member) => member.age === undefined || member.age >= 18).length;
  return 1 / sharers;
}

/**
 * What this household is paid in total, or `undefined` when no cheque is sent
 * to anyone in it.
 *
 * Where two or more people in one household qualify, each files their own
 * application and each receives their own cheque ("Only married couples' names
 * may appear on one application" — Q11), so the household's figure is the sum
 * of separate grants rather than one grant computed over them jointly. No rent
 * is double-counted doing that: every applicant is credited with only their own
 * share of it, and an applicant whose own grant would not be issued contributes
 * nothing rather than dragging the others down.
 *
 * Utilities are counted at **nothing**, which is the largest approximation in
 * this file after the income table itself. The rebate refunds rent plus
 * electricity, gas, water and fuel *actually paid* (Q&A booklet, Q48), and the
 * Household profile records which utilities a household pays for but not what
 * they cost — `utilitiesPaid` exists for SNAP, where Connecticut substitutes a
 * flat allowance for real bills and the amounts are therefore never needed.
 * That substitution is a SNAP rule and does not travel, so this Program counts
 * rent alone and understates every grant by 35% of the utilities the applicant
 * pays.
 */
function grantFor(
  applicants: Member[],
  monthlyRent: Money,
  share: number,
  figures: RebateFigures,
): Money | undefined {
  // The share of rent one applicant is credited with is the same for all of
  // them — §12-170d assumes an equal split — so it is computed once and the
  // income half, which is personal, is computed per applicant below.
  const rentAndUtilities = Math.round(monthlyRent * 12 * share);
  const fromRent = Math.round(rentAndUtilities * figures.shareOfRentAndUtilities);

  const total = applicants.reduce(
    (sum, applicant) => sum + (grantForOneApplicant(applicant, fromRent, figures) ?? 0),
    0,
  );

  return total > 0 ? total : undefined;
}

/**
 * One applicant's own cheque, or `undefined` when the state sends them none.
 *
 * Form M-35r's arithmetic, lines 13 through 20: 35% of their share of rent and
 * utilities, less 5% of their qualifying income; nothing at all if that is zero
 * or negative (Q57); otherwise capped at the income table's maximum. That
 * maximum is `figures.maximumGrant`, which is the first band of a graduated
 * table applied across the whole income range — the caveat on
 * `RENTERS_REBATE_FIGURES` is where that is set out, and this is the line that
 * becomes a lookup on `qualifyingIncome` once OPM's 2026 table is in hand.
 *
 * The minimum payable is tested here rather than on the household's total,
 * because it is a fact about a cheque and each applicant gets their own: two
 * applicants owed $6 apiece are sent nothing, not $12.
 */
function grantForOneApplicant(
  applicant: Member,
  fromRent: Money,
  figures: RebateFigures,
): Money | undefined {
  const fromIncome = Math.round(qualifyingIncomeOf([applicant]) * figures.shareOfQualifyingIncome);
  const grant = Math.min(Math.max(0, fromRent - fromIncome), figures.maximumGrant);

  return grant >= figures.minimumPayable ? grant : undefined;
}

/**
 * Qualifying income: **all** taxable and nontaxable income, net Social Security
 * included (Q&A booklet Q26, sourced to Box 5 of the SSA-1099).
 *
 * A third definition of income from the same sources, and the point of ADR-0009
 * made concrete. SNAP splits these streams into earned and unearned and applies
 * a deduction to one half; the rebate draws no such line and counts the lot.
 * A Household profile that had stored "annual income: $24,900" could not have
 * served both.
 *
 * Two refinements OPM applies and this does not: a part-year renter's income is
 * apportioned by the months they rented (Q59), and the prior year's Social
 * Security is back-calculated out of the current year's cheque by removing the
 * COLA and adding Medicare premiums (Q52). Both need facts about last year that
 * this conversation never asks for, so BenefitBridge prices today's income as
 * though it were the benefit year's.
 */
function qualifyingIncomeOf(applicants: Member[]): Money {
  return (monthlyTotal(applicants.flatMap((applicant) => applicant.incomeSources ?? [])) ?? 0) * 12;
}

