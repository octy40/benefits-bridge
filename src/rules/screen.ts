import type { HouseholdProfile, IsoDate, ScreeningResult } from "./types";

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
 *
 * Walking skeleton: nothing is scored yet. Every Program arrives via its own
 * ticket, starting with SNAP under CT's broad-based categorical eligibility.
 */
export function screen(
  _profile: HouseholdProfile,
  asOf: IsoDate,
  sequence: number,
): ScreeningResult {
  return {
    asOf,
    sequence,
    programs: [],
    keychain: [],
    headlineAnnualTotal: 0,
    blockingFacts: [],
  };
}
