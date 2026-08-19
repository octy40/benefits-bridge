import type { Money } from "./types";

/**
 * 2026 HHS Poverty Guidelines, 100% FPL, annual — the only FPL vintage this
 * repository has sourced (`docs/ct-program-facts.md` §0).
 *
 * Shared rather than kept per Program: CEAP's own bands (125%, 200%),
 * Lifeline's income route (135%), and the utility Low-Income Discount Rate's
 * tiers (100%, 125%, 160%) are all plain multiples of this one table
 * (`docs/ct-program-facts.md` §7's cross-check) — a second copy is exactly the
 * kind of drift that gets one Program's threshold quietly out of step with
 * another's.
 *
 * Recorded plainly because it is a real approximation and not a citation: the
 * CEAP fact sheet's own income table, which would show exactly which FPL
 * vintage DSS priced the FFY2026 season from, was not machine-extracted. The
 * elsewhere-confirmed cross-check in `docs/ct-program-facts.md` §7 — "the 40%
 * [LIDR] tier is exactly 125% FPG [2026]" — is the best evidence this is the
 * table BenefitBridge is meant to use throughout.
 */
export const FPL_100_ANNUAL_BY_HOUSEHOLD_SIZE: Money[] = [
  1_596_000, 2_164_000, 2_732_000, 3_300_000, 3_868_000, 4_436_000, 5_004_000, 5_572_000,
];
export const FPL_EACH_ADDITIONAL_MEMBER: Money = 568_000;

/**
 * 100% FPL, annual, for any household size — tabulated through eight and
 * extrapolated by the fixed per-member increment beyond it, since the source
 * table gives one (unlike an SMI ceiling, which a Program instead holds flat
 * past its own tabulated size — see `programs/ceap.ts`'s `smiLimitFor`).
 */
export function fplAnnual(householdSize: number): Money {
  const tabulated = FPL_100_ANNUAL_BY_HOUSEHOLD_SIZE[householdSize - 1];
  if (tabulated !== undefined) return tabulated;

  const largest = FPL_100_ANNUAL_BY_HOUSEHOLD_SIZE[FPL_100_ANNUAL_BY_HOUSEHOLD_SIZE.length - 1]!;
  return largest + FPL_EACH_ADDITIONAL_MEMBER * (householdSize - FPL_100_ANNUAL_BY_HOUSEHOLD_SIZE.length);
}
