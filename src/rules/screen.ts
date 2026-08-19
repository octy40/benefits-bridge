import { rankBlockingFacts } from "./facts";
import { screenLifeline } from "./keychain/lifeline";
import { screenLidr } from "./keychain/lidr";
import { screenMuseumsForAll } from "./keychain/museums-for-all";
import type { KeychainRule } from "./keychain-rule";
import type { ProgramRule, ProgramScreening } from "./program-rule";
import { screenCeap } from "./programs/ceap";
import { screenSnap } from "./programs/snap";
import type {
  BlockingFact,
  HouseholdProfile,
  ImmigrationStatusAnswer,
  IsoDate,
  Money,
  ProgramResult,
  ScreeningResult,
} from "./types";

/**
 * Every Program BenefitBridge screens, in eligibility map order.
 *
 * Adding a Program is adding a line here and a rules file — no prompt change,
 * because the conversation's agenda comes from what these report themselves
 * blocked on (ADR-0002).
 */
const PROGRAM_RULES: ProgramRule[] = [screenSnap, screenCeap];

/**
 * Every Keychain entry BenefitBridge screens, run after `PROGRAM_RULES` for
 * the reason `screen` below explains: a Keychain rule may read Program
 * outcomes as well as the Household profile (`keychain/lidr.ts` reads CEAP's).
 */
const KEYCHAIN_RULES: KeychainRule[] = [screenLifeline, screenLidr, screenMuseumsForAll];

/**
 * The single seam. All Screening lives behind this function.
 *
 * Pure and synchronous: no I/O, no clock access. `asOf` is a parameter so the
 * effective-dated figure tables are assertable in both directions without time
 * travel.
 *
 * `sequence` is a parameter for the same reason, and this is a deliberate
 * divergence from the signature in the spec: `ScreeningResult` carries a
 * `sequence`, but a monotonic counter cannot come from a pure function. The
 * conversation owns the counter and `screen` stamps what it is handed. It is
 * required rather than defaulted so no caller can quietly emit map 0 twice and
 * leave two live maps in the window (ADR-0010).
 *
 * Program unit derivation, income derivation, effective-dated table lookup,
 * tier classification and the Keychain pass all belong *inside* here and are
 * deliberately not independently reachable (ADR-0011).
 */
export function screen(
  profile: HouseholdProfile,
  asOf: IsoDate,
  sequence: number,
): ScreeningResult {
  const screenings = PROGRAM_RULES.map((rule) => rule(profile, asOf));
  const programs = screenings.flatMap((screening) => screening.result ?? []);

  // The Keychain is a second pass, because a Keychain rule may read Program
  // outcomes as well as the Household profile.
  const keychainScreenings = KEYCHAIN_RULES.map((rule) => rule(profile, programs, asOf));
  const keychain = keychainScreenings.flatMap((screening) => screening.result ?? []);

  const blockingFacts = rankBlockingFacts([...screenings, ...keychainScreenings]);
  const headlineEntries = [...programs, ...keychain];

  return {
    asOf,
    sequence,
    programs,
    keychain,
    headlineAnnualTotal: headlineTotal(headlineEntries),
    ...(headlineIncludesProvisionalFigure(headlineEntries) ? { headlineAnnualTotalProvisional: true } : {}),
    blockingFacts,
    ...statusQuestion(screenings, profile.immigrationStatus, blockingFacts),
  };
}

/**
 * Whether the one optional question is open, and which Programs it would move.
 *
 * Three conditions, and each is doing separate work:
 *
 *  - nobody has asked. Every answer, `"declined"` included, closes the question
 *    for good — asking twice is the ADR-0004 violation;
 *  - at least one Program is otherwise scorable and turns on the answer, so the
 *    reason for asking can be stated as a fact about *this* household rather
 *    than as a category;
 *  - nothing is left on the Blocking facts list. That keeps ADR-0002's
 *    single-agenda property true at every point: first the ranked list, then —
 *    once there is nothing left to ask — one optional question. It also means a
 *    Resident who leaves early is never asked at all.
 *
 * This reports that the question is *open*, not that it has never been put. A
 * pure function cannot know the latter; the conversation owns that, exactly as
 * it owns the `sequence` counter above.
 */
function statusQuestion(
  screenings: ProgramScreening[],
  status: ImmigrationStatusAnswer | undefined,
  blockingFacts: BlockingFact[],
): Pick<ScreeningResult, "statusQuestion"> {
  if (status !== undefined || blockingFacts.length > 0) return {};

  const blocks = screenings
    .filter((screening) => screening.awaitingStatus)
    .map((screening) => screening.programId);

  return blocks.length > 0 ? { statusQuestion: { blocks } } : {};
}

/**
 * Tier 1 only: entries BenefitBridge can put a defensible figure on. An entry
 * with no figure contributes nothing rather than a zero, and an entry the
 * household is likely ineligible for contributes nothing at all.
 *
 * An `indeterminate` entry contributes nothing either, and the existing filter
 * is why — the headline is built from what BenefitBridge can defend, so an
 * entry it cannot put either way has no place in it (ADR-0004, ADR-0010).
 */
function headlineTotal(entries: ProgramResult[]): Money {
  return entries
    .filter((entry) => entry.outcome === "likely-eligible")
    .reduce((total, entry) => total + (entry.figures?.annual ?? 0), 0);
}

/**
 * Whether any figure that actually contributed to `headlineTotal` is
 * provisional — the same `likely-eligible` filter, so an ineligible or
 * indeterminate entry's `provisional` flag (which cannot happen today, but
 * nothing prevents it structurally) never taints a total it never joined.
 */
function headlineIncludesProvisionalFigure(entries: ProgramResult[]): boolean {
  return entries.some((entry) => entry.outcome === "likely-eligible" && entry.figures?.provisional === true);
}
