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

/**
 * How a fact that is holding up a *figure* is described back to the Resident.
 *
 * Only the facts that block a figure need an entry: a fact that blocks an
 * outcome keeps its Program off the map entirely, so there is no line to label.
 * Naming the specific fact is what makes an entry moving from tier 2 to tier 1
 * read as an answer arriving rather than as an estimate wobbling.
 */
const FIGURE_BLOCKER_NAMES: Record<string, string> = {
  rent: "what you pay in rent",
  "utility-costs": "which utilities you pay for",
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
              <span className="map-entry-basis">{monthlyAndBasis(entry)}</span>
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

/**
 * The line under a tier-1 figure: the monthly form, and the period the agency
 * published the figure for.
 *
 * Both come from `screen`. A monthly amount this panel divided out of an annual
 * one would be a number nobody can defend, so an entry that carries no monthly
 * figure simply does not show one (ADR-0010). The period is here because "$573
 * a month" invites "as of when?", and the answer should be on screen rather
 * than in someone's memory of which fiscal year this is.
 */
function monthlyAndBasis(entry: ProgramResult): string {
  const monthly = entry.figures?.monthly;

  return [monthly === undefined ? undefined : `${formatMoney(monthly)} a month`, entry.figures?.basis]
    .filter((part) => part !== undefined)
    .join(" · ");
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
  const waitingOn = entry.blockedBy.map((factId) => FIGURE_BLOCKER_NAMES[factId] ?? factId);
  if (waitingOn.length > 0) {
    return `You likely qualify — tell us ${joinWithAnd(waitingOn)} and this gets a figure.`;
  }

  return "You likely qualify — we are still working out what it is worth.";
}

function joinWithAnd(phrases: string[]): string {
  if (phrases.length <= 1) return phrases.join("");
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}
