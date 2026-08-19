import type { ProgramScreening } from "./program-rule";
import type { HouseholdProfile, IsoDate, ProgramResult } from "./types";

/**
 * A Keychain rule's shape differs from a `ProgramRule`'s by exactly one
 * parameter: the Program results this pass already produced. The utility
 * Low-Income Discount Rate reads CEAP's outcome from `programs` because
 * applying for CEAP automatically enrols a household in it
 * (`keychain/lidr.ts`; `docs/ct-program-facts.md` §7) — a link only a second
 * pass over the Household profile could see (`screen.ts`).
 *
 * Returns the same `ProgramScreening` shape a Program does, for the same
 * reason: a Keychain entry is screened by the same rules (CONTEXT.md,
 * *Keychain*), and `screen` folds both kinds of screening into one
 * `blockingFacts` ranking so Elicitation's agenda covers both without knowing
 * the difference.
 */
export type KeychainRule = (
  profile: HouseholdProfile,
  programs: ProgramResult[],
  asOf: IsoDate,
) => ProgramScreening;
