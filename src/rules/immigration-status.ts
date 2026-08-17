import type { ProgramScreening } from "./program-rule";
import type { ImmigrationStatusAnswer } from "./types";

/**
 * What a Program whose rules turn on immigration status does with the one
 * answer BenefitBridge asks for and never requires.
 *
 * Written once, here, rather than per Program: forgetting it inside a rules
 * file is silent and looks exactly like a correct score, so every
 * status-dependent Program wraps its scored screening in this and the
 * short-circuit exists in one place (ADR-0004).
 *
 * The implementation is deliberately **coarse**: one household-level answer,
 * sending status-dependent Programs to Indeterminate wholesale. Real status
 * rules are per member, and per-member evaluation is the correction to this
 * design rather than an enhancement of it — it is out of scope here and named
 * in ADR-0004 as amended.
 *
 * | `status`           | what happens                                  |
 * | ------------------ | --------------------------------------------- |
 * | `undefined`        | scores normally, figures and all               |
 * | `"all-qualifying"` | scores normally, figures and all               |
 * | `"mixed"`          | `indeterminate`                                |
 * | `"declined"`       | `indeterminate`                                |
 *
 * **The cost of the first row, stated plainly because it was accepted with open
 * eyes.** Treating an unasked status as scorable means a Resident who is asked
 * and *declines* ends up with a worse map than one who was never asked at all —
 * the same household, the same facts, a smaller headline for having exercised
 * the choice BenefitBridge offered them. That cuts against the very fear
 * ADR-0004 exists to defuse. It is accepted anyway, because the alternative —
 * `indeterminate` until somebody says `"all-qualifying"` — makes every map
 * indeterminate from the first turn and holds the headline at $0 for the whole
 * conversation, which withholds from *everyone* what this only withholds from
 * the Resident who declined. Per-member evaluation removes the choice between
 * them; nothing short of it does.
 */
export function statusDependent(
  screening: ProgramScreening,
  status: ImmigrationStatusAnswer | undefined,
): ProgramScreening {
  const { result } = screening;

  // Nothing to withhold. A Program with no result is already absent from the
  // map, and a likely-ineligible one stays likely-ineligible whatever the
  // answer would have been: status can only shrink a Program unit while the
  // dropped member's income is still counted (7 CFR 273.11(c)(3)), which is
  // strictly harsher than the test just applied. Saying "we cannot tell" to a
  // household we can tell about is its own kind of wrong, and it would also put
  // the optional question in front of a Resident it could not help.
  if (!result || result.outcome !== "likely-eligible") return screening;

  if (status === undefined) return { ...screening, awaitingStatus: true };
  if (status === "all-qualifying") return screening;

  // `"mixed"` lands here with `"declined"` rather than on likely-ineligible,
  // and that is the distinction this whole type exists to preserve: a
  // mixed-status household is not an ineligible household. Under 7 CFR
  // 273.11(c)(3) the ineligible member is dropped from the Program unit and
  // their income is still counted against the smaller unit's limit, so the
  // citizen children remain eligible — for a *smaller* allotment this module
  // cannot compute without evaluating status per member. Unscorable, not
  // ineligible.
  return {
    programId: screening.programId,
    // Both lists emptied. What is still missing would only buy a figure for an
    // entry that has no outcome to price, so chasing it would put questions
    // into the conversation that buy the Resident nothing — the same reason a
    // likely-ineligible household is never asked what it pays in rent. The
    // facts come back onto the agenda by themselves if `"all-qualifying"` is
    // ever recorded, because `screen` is pure and re-runs from the profile.
    blockedBy: [],
    result: {
      programId: result.programId,
      outcome: "indeterminate",
      // The unit is reported as derived — who this Program would count if
      // everyone qualified. Real SNAP would count *fewer* people here
      // (7 CFR 273.11(c)(3)); the number is honest about the household and not
      // about the Program, which is defensible only next to an outcome that
      // says BenefitBridge cannot score it.
      unit: result.unit,
      // No `figures`. A figure on an entry BenefitBridge cannot put either way
      // is a number nobody can defend (ADR-0010), and it would sum into the
      // headline as though it were owed.
      blockedBy: [],
    },
  };
}
