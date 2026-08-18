/**
 * The rules module's vocabulary. Per ADR-0011 this is the part built to last —
 * everything above the `screen()` seam is demo scaffolding.
 */

/** Whole US cents. Never a float dollar amount; never formatted for display here. */
export type Money = number;

/** ISO 8601 calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

/** Stable identifier a Resident's household member is known by within one conversation. */
export type MemberId = string;

/**
 * Identifier for a fact the rules module can be missing. Closed rather than
 * `string` so the canonical ask-order in `facts.ts` is exhaustive by
 * construction: a Program cannot declare itself blocked on a fact Elicitation
 * has no place for.
 */
export type FactId =
  | "household-members"
  | "food-sharing"
  | "income-sources"
  | "work-hours"
  | "rent"
  | "utility-costs";

/** Identifier for a Program or Keychain entry, e.g. `snap`, `ct-eitc`, `lifeline`. */
export type ProgramId = string;

export type Outcome = "likely-eligible" | "likely-ineligible" | "indeterminate";

export type IncomePeriod = "hourly" | "weekly" | "biweekly" | "monthly" | "annual";

export type IncomeType =
  | "wages"
  | "cash-self-employment"
  | "social-security"
  | "ssi"
  | "unemployment"
  | "child-support"
  | "other";

/**
 * One stream of money reaching one member. Programs disagree about what income
 * *is*, not merely about the period it is expressed in, so the type is kept
 * rather than collapsed into a single figure (ADR-0009).
 */
export type IncomeSource = {
  type: IncomeType;
  amount: Money;
  period: IncomePeriod;
  /**
   * Only meaningful when `period` is `hourly`, where it is required: an hourly
   * rate is not an amount of money until it is multiplied by hours, and that
   * multiplication is arithmetic, so it happens here rather than in the
   * conversation (ADR-0010). Absent on an hourly source is a Blocking fact,
   * not a reason to guess at full time.
   */
  hoursPerWeek?: number;
};

/**
 * A utility a household pays for separately from its rent.
 *
 * Closed rather than `string` because SNAP's utility allowance turns on
 * *which* ones: a heating or cooling cost buys the Standard Utility Allowance,
 * two or more other utilities buy the Limited one, and a phone bill alone buys
 * the Telephone allowance (7 CFR 273.9(d)(6)(iii)). A free-text list would
 * leave that classification to string matching on whatever the conversation
 * happened to type.
 *
 * `internet` is recordable and deliberately buys nothing: OBBBA (P.L. 119-21)
 * §10104 bars internet service fees from the shelter deduction. eCFR 273.9 has
 * not been amended for it and still reads as though internet were allowable —
 * the statute is the authority here, not the stale regulatory text.
 */
export type UtilityPaid =
  | "heat"
  | "air-conditioning"
  | "electricity"
  | "gas"
  | "water"
  | "sewer"
  | "trash"
  | "phone"
  | "internet";

/**
 * One person in the Household profile. Modelled individually because Program
 * rules turn on specific members — a child's exact age, a member being 65 or
 * over, which people purchase and prepare food together.
 */
export type Member = {
  id: MemberId;
  age?: number;
  relationship?: string;
  /** Feeds SNAP's Program unit. Each Program derives its own unit (ADR-0003). */
  sharesFoodPurchaseAndPreparation?: boolean;
  /**
   * Absent and empty mean different things, and the difference is the whole
   * point of the field: `undefined` is "nobody has asked yet" and keeps
   * `income-sources` on the Blocking facts list; `[]` is "asked, and this
   * person has none" and unblocks Screening. Collapsing the two would make a
   * four-year-old and an unasked adult indistinguishable.
   */
  incomeSources?: IncomeSource[];
};

/**
 * The structured record the conversation produces and Screening runs on.
 * There is deliberately no `householdSize` (ADR-0003) and no `income`
 * (ADR-0009) — every Program derives both from `members`.
 */
export type HouseholdProfile = {
  members: Member[];
  town?: string;
  monthlyRent?: Money;
  /**
   * Absent and empty differ here for the same reason they differ on
   * `incomeSources`: `undefined` is "nobody has asked yet" and keeps
   * `utility-costs` on the Blocking facts list; `[]` is "asked, and everything
   * is included in the rent" and unblocks the allotment with a utility
   * allowance of nothing.
   */
  utilitiesPaid?: UtilityPaid[];
  programsAlreadyReceived?: ProgramId[];
  /**
   * Optional, always. A Resident who declines still gets an eligibility map;
   * status-dependent Programs report `indeterminate` (ADR-0004).
   */
  immigrationStatus?: ImmigrationStatusAnswer;
};

/**
 * The household's answer to the one question BenefitBridge asks and never
 * requires.
 *
 * Absent and answered mean different things, and the difference is the whole
 * point of the field — the same distinction `incomeSources` draws, for the same
 * reason. `undefined` is "nobody has asked yet"; every other value means the
 * question has been put, and putting it a second time violates ADR-0004.
 * `"declined"` is therefore load-bearing rather than an absence: it is the only
 * thing that closes the question without answering it.
 *
 * There is deliberately no value meaning "somebody here does not qualify, so
 * screen them out". This implementation cannot evaluate status per member, and
 * a mixed-status household is not an ineligible household: under SNAP the
 * ineligible member is dropped from the Program unit and their income is still
 * counted (7 CFR 273.11(c)(3)), so the citizen children remain eligible.
 * `"mixed"` therefore lands on `indeterminate` alongside `"declined"` —
 * unscorable, not ineligible. Scoring it is per-member evaluation, which is the
 * correction to this design and not part of it (ADR-0004 as amended).
 *
 * What each value does to Screening lives in `immigration-status.ts`, including
 * the cost of treating `undefined` as scorable.
 */
export type ImmigrationStatusAnswer =
  /** Asked; the Resident chose not to say, or said nothing. */
  | "declined"
  /** Every member the Programs would count has a status those Programs recognise. */
  | "all-qualifying"
  /** At least one member does not. Indeterminate here, scorable per member later. */
  | "mixed";

export const emptyHouseholdProfile = (): HouseholdProfile => ({ members: [] });

export type NoFigureReason = "coverage-not-cash" | "waitlisted";

export type ProgramResult = {
  programId: ProgramId;
  outcome: Outcome;
  /** Who *this* Program counted. Differs per Program by design (ADR-0003). */
  unit: MemberId[];
  /**
   * Absent means tier 2 on the eligibility map. Every derived form the
   * conversation might need is here, because the model may not divide or sum
   * (ADR-0010) — `basis` included, so a figure is never quoted without the
   * period the agency published it for.
   */
  figures?: { monthly?: Money; annual: Money; basis?: string };
  noFigureReason?: NoFigureReason;
  waitlist?: { typicalWaitMonths: number; invitingApplicationsReceivedBy: IsoDate };
  /**
   * The facts this entry is still waiting on.
   *
   * Empty when the entry is complete. Non-empty on an entry that nonetheless
   * has an `outcome` means the *outcome* is settled and the *figure* is not:
   * SNAP knows a household is likely eligible long before it knows their rent.
   * Such an entry sits in tier 2 with no `figures` and moves to tier 1 when the
   * fact lands, which is what makes the map read as refinement rather than as
   * a number that will not sit still.
   *
   * Facts needed to score the outcome at all are a different thing: a Program
   * missing one reports no `ProgramResult` and is absent from the map entirely
   * (`program-rule.ts`).
   *
   * An `indeterminate` entry carries `[]` and is neither scored nor blocked:
   * what it lacks is immigration status, which is not a Blocking fact because
   * Elicitation never goes and gets it (CONTEXT.md, *Blocking fact*; ADR-0004).
   */
  blockedBy: FactId[];
};

export type BlockingFact = { factId: FactId; blocks: ProgramId[] };

export type ScreeningResult = {
  asOf: IsoDate;
  /** Declares that figures in tool results with a lower sequence are dead (ADR-0010). */
  sequence: number;
  programs: ProgramResult[];
  keychain: ProgramResult[];
  /** Sum of tier-1 annual figures only. */
  headlineAnnualTotal: Money;
  /** Ranked, most Programs blocked first. Drives Elicitation (ADR-0002). */
  blockingFacts: BlockingFact[];
  /**
   * The one question that is not on the Blocking facts list.
   *
   * Present only while nobody has asked, at least one otherwise-scorable
   * Program turns on the answer, and `blockingFacts` is empty — so the two
   * agendas never compete and ADR-0002's single-agenda property stays true at
   * every point in the conversation. Absent forever after anything is recorded,
   * including a decline.
   *
   * `blocks` names the Programs the answer would move, so the reason can be
   * stated when the question is put. ADR-0004 requires the reason; a question
   * whose reason the conversation had to invent is the one that reads as a
   * demand.
   */
  statusQuestion?: { blocks: ProgramId[] };
};
