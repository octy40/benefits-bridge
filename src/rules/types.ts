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
export type FactId = "household-members" | "food-sharing" | "income-sources" | "work-hours";

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
  utilitiesPaid?: string[];
  programsAlreadyReceived?: ProgramId[];
  /**
   * Optional, always. A Resident who declines still gets an eligibility map;
   * status-dependent Programs report `indeterminate` (ADR-0004).
   */
  immigrationStatusShared?: boolean;
};

export const emptyHouseholdProfile = (): HouseholdProfile => ({ members: [] });

export type NoFigureReason = "coverage-not-cash" | "waitlisted";

export type ProgramResult = {
  programId: ProgramId;
  outcome: Outcome;
  /** Who *this* Program counted. Differs per Program by design (ADR-0003). */
  unit: MemberId[];
  /** Absent means tier 2 on the eligibility map. */
  figures?: { monthly?: Money; annual: Money };
  noFigureReason?: NoFigureReason;
  waitlist?: { typicalWaitMonths: number; invitingApplicationsReceivedBy: IsoDate };
  /** Empty once scored. */
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
};
