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
export function EligibilityMapPanel({ screening }: { screening: ScreeningResult }) {
  const isEmpty = screening.programs.length === 0 && screening.keychain.length === 0;

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

      <EntryGroup entries={screening.programs} />
      {/*
        The Keychain is grouped separately because nobody administers these
        together, not because they are computed differently — same rendering,
        different grouping (CONTEXT.md, *Keychain*).
      */}
      <EntryGroup entries={screening.keychain} heading="Discounts your eligibility unlocks" />

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
              <span className="map-entry-name">{entry.programId}</span>
              <span className="map-entry-figure">{formatMoney(entry.figures!.annual)} a year</span>
            </li>
          ))}
        </ol>
      ) : null}

      {withoutFigures.length > 0 ? (
        <ol className="map-tier map-tier-two">
          {withoutFigures.map((entry) => (
            <li key={entry.programId} className="map-entry">
              <span className="map-entry-name">{entry.programId}</span>
              <span className="map-entry-reason">{reasonForNoFigure(entry)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function reasonForNoFigure(entry: ProgramResult): string {
  if (entry.noFigureReason === "coverage-not-cash") return "Coverage, not cash — no dollar figure to give.";
  if (entry.noFigureReason === "waitlisted" && entry.waitlist) {
    return `There is a queue — about ${entry.waitlist.typicalWaitMonths} months. Your place is set by your application date, so apply now.`;
  }
  if (entry.outcome === "indeterminate") return "Cannot be scored without a fact you are not required to give.";
  return "No defensible figure yet.";
}
