import type { KeychainRule } from "../keychain-rule";
import { SNAP } from "../programs/snap";
import type { ProgramId } from "../types";

export const MUSEUMS_FOR_ALL: ProgramId = "museums-for-all";

/**
 * Museums for All requires a physical EBT card at the door (`docs/ct-program-facts.md`
 * §7), so it derives strictly from SNAP *receipt* — `programsAlreadyReceived`
 * — and nothing else. Unlike Lifeline and LIDR it has no independent income
 * route: a household merely screened `likely-eligible` for SNAP this
 * conversation has no card in hand, so that outcome — read from `programs`
 * like LIDR reads CEAP's — is deliberately not tested here.
 *
 * A household not (yet) recorded as receiving SNAP is simply absent from the
 * map, the same as any Program nothing the Resident could say yet would
 * change: `programsAlreadyReceived` is not itself a Blocking fact anywhere in
 * this codebase (`programs/ceap.ts`'s `isCategoricallyEligible` takes the
 * same stance), so there is nothing to name in `blockedBy`.
 */
export const screenMuseumsForAll: KeychainRule = (profile) => {
  const receivesSnap = profile.programsAlreadyReceived?.includes(SNAP) ?? false;
  if (!receivesSnap) return { programId: MUSEUMS_FOR_ALL, blockedBy: [] };

  return {
    programId: MUSEUMS_FOR_ALL,
    blockedBy: [],
    result: {
      programId: MUSEUMS_FOR_ALL,
      outcome: "likely-eligible",
      unit: profile.members.map((member) => member.id),
      // Free-to-$5 admission, and only when a Resident actually visits — there
      // is no annual dollar figure BenefitBridge could defend (ADR-0010).
      noFigureReason: "coverage-not-cash",
      blockedBy: [],
    },
  };
};
