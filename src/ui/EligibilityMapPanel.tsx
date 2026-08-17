import { formatMoney } from "@/money";
import type { ProgramResult, ScreeningResult } from "@/rules/types";

/**
 * The eligibility map.
 *
 * It renders from `ScreeningResult` and from nothing else. There is deliberately
 * no prop, no context and no other path by which model-authored text could
 * reach this panel — which is what makes "the AI never produces a dollar figure"
 * a structural fact rather than prompt discipline (ADR-0001).
 *
 * Two tiers, per CONTEXT.md: entries carrying a defensible figure sum to the
 * headline; entries with no figure sit beneath it, each carrying its own reason.
 */
/**
 * Resident-facing names. Program ids are the rules module's vocabulary and are
 * not for reading — this is the layer the language toggle replaces wholesale.
 */
const PROGRAM_NAMES: Record<string, string> = {
  snap: "SNAP food assistance",
};

export function EligibilityMapPanel({ screening }: { screening: ScreeningResult }) {
  // A Program the household is likely ineligible for is left off rather than
  // listed with a zero, so the map stays a list of things to do.
  const programs = screening.programs.filter((entry) => entry.outcome !== "likely-ineligible");
  const keychain = screening.keychain.filter((entry) => entry.outcome !== "likely-ineligible");
  const isEmpty = programs.length === 0 && keychain.length === 0;

  return (
    <aside className="map" aria-label="Eligibility map">
      <div className="map-headline">
        <p className="map-headline-label">Likely available to you each year</p>
        <p className="map-headline-total">{formatMoney(screening.headlineAnnualTotal)}</p>
        <p className="map-headline-note">This estimate updates as we learn more.</p>
      </div>

      {isEmpty ? (
        <p className="map-empty">
          Nothing to show yet. Tell BenefitBridge about your household and this fills in as you talk.
        </p>
      ) : null}

      <EntryGroup entries={programs} />
      {/*
        The Keychain is grouped separately because nobody administers these
        together, not because they are computed differently — same rendering,
        different grouping (CONTEXT.md, *Keychain*).
      */}
      <EntryGroup entries={keychain} heading="Discounts your eligibility unlocks" />

      <p className="map-caveat">
        BenefitBridge screens — it never decides. Only the agency running a Program can do that.
      </p>
    </aside>
  );
}

function EntryGroup({ entries, heading }: { entries: ProgramResult[]; heading?: string }) {
  if (entries.length === 0) return null;

  const withFigures = entries.filter((entry) => entry.figures);
  const withoutFigures = entries.filter((entry) => !entry.figures);

  return (
    <section className="map-group">
      {heading ? <h2 className="map-group-heading">{heading}</h2> : null}

      {withFigures.length > 0 ? (
        <ol className="map-tier">
          {withFigures.map((entry) => (
            <li key={entry.programId} className="map-entry">
              <span className="map-entry-name">{nameOf(entry)}</span>
              <span className="map-entry-figure">{formatMoney(entry.figures!.annual)} a year</span>
            </li>
          ))}
        </ol>
      ) : null}

      {withoutFigures.length > 0 ? (
        <ol className="map-tier map-tier-two">
          {withoutFigures.map((entry) => (
            <li key={entry.programId} className="map-entry">
              <span className="map-entry-name">{nameOf(entry)}</span>
              <span className="map-entry-reason">{reasonForNoFigure(entry)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function nameOf(entry: ProgramResult): string {
  return PROGRAM_NAMES[entry.programId] ?? entry.programId;
}

function reasonForNoFigure(entry: ProgramResult): string {
  if (entry.noFigureReason === "coverage-not-cash") return "Coverage, not cash — no dollar figure to give.";
  if (entry.noFigureReason === "waitlisted" && entry.waitlist) {
    return `There is a queue — about ${entry.waitlist.typicalWaitMonths} months. Your place is set by your application date, so apply now.`;
  }
  if (entry.outcome === "indeterminate") return "Cannot be scored without a fact you are not required to give.";
  // "Likely qualify", never "qualify": BenefitBridge screens, and only the
  // agency running a Program can decide that anyone qualifies (CONTEXT.md,
  // *Screening*).
  return "You likely qualify — we are still working out what it is worth.";
}
