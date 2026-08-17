import { rankBlockingFacts } from "./facts";
import type { ProgramRule } from "./program-rule";
import { screenSnap } from "./programs/snap";
import type { HouseholdProfile, IsoDate, Money, ProgramResult, ScreeningResult } from "./types";

/**
 * Every Program BenefitBridge screens, in eligibility map order.
 *
 * Adding a Program is adding a line here and a rules file — no prompt change,
 * because the conversation's agenda comes from what these report themselves
 * blocked on (ADR-0002).
 */
const PROGRAM_RULES: ProgramRule[] = [screenSnap];

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
  // outcomes as well as the Household profile. It arrives with its entries.
  const keychain: ProgramResult[] = [];

  return {
    asOf,
    sequence,
    programs,
    keychain,
    headlineAnnualTotal: headlineTotal([...programs, ...keychain]),
    blockingFacts: rankBlockingFacts(screenings),
  };
}

/**
 * Tier 1 only: entries BenefitBridge can put a defensible figure on. An entry
 * with no figure contributes nothing rather than a zero, and an entry the
 * household is likely ineligible for contributes nothing at all.
 */
function headlineTotal(entries: ProgramResult[]): Money {
  return entries
    .filter((entry) => entry.outcome === "likely-eligible")
    .reduce((total, entry) => total + (entry.figures?.annual ?? 0), 0);
}
