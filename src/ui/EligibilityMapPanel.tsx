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
 * Indeterminate entries are neither, and are grouped apart from both — a
 * Program BenefitBridge cannot place is not a smaller version of one it can.
 */
/**
 * Resident-facing names. Program ids are the rules module's vocabulary and are
 * not for reading — this is the layer the language toggle replaces wholesale.
 */
const PROGRAM_NAMES: Record<string, string> = {
  snap: "SNAP food assistance",
  ceap: "CEAP energy assistance",
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
  // A household is only ever asked this when age alone could not already
  // settle CEAP's vulnerable-household distinction.
  disability: "whether anyone in your household has a disability",
  // Reaches a figure-blocker line only through CEAP's categorical-eligibility
  // path: the household is already known likely-eligible from Program
  // receipt, and income is still what prices the figure.
  "income-sources": "what your household brings in",
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
        <p className="map-headline-note">
          This estimate updates as we learn more.
          {screening.headlineAnnualTotalProvisional
            ? " It includes a proposed figure that is not yet final."
            : null}
        </p>
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

  // Split on `outcome` before splitting on `figures`. An Indeterminate entry
  // also has no figure, and grouped by figures alone it would sit in the
  // tier-2 list looking exactly like a Program the household likely qualifies
  // for and is merely waiting on a number for — under a headline that says
  // "Likely available to you each year", which reads as a win. They are
  // opposite things and get opposite treatment (CONTEXT.md, *Indeterminate*).
  const indeterminate = entries.filter((entry) => entry.outcome === "indeterminate");
  const scored = entries.filter((entry) => entry.outcome !== "indeterminate");
  const withFigures = scored.filter((entry) => entry.figures);
  const withoutFigures = scored.filter((entry) => !entry.figures);

  return (
    <section className="map-group">
      {heading ? <h2 className="map-group-heading">{heading}</h2> : null}

      {withFigures.length > 0 ? (
        <ol className="map-tier">
          {withFigures.map((entry) => (
            <li key={entry.programId} className="map-entry">
              <span className="map-entry-name">
                {nameOf(entry)}
                {/*
                  A caption is prose a reader has to interpret; `provisional`
                  is a fact this panel acts on directly (ADR-0010). CEAP's
                  FFY2027 season is the first figure carrying it.
                */}
                {entry.figures?.provisional ? <span className="map-entry-provisional">Proposed</span> : null}
              </span>
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

      {/*
        Its own group, heading and modifier class, so an entry BenefitBridge
        cannot place is visibly not one of the things above it. The heading
        carries the choice back to the Resident rather than leaving it in a
        sentence they may not read (ADR-0004).
      */}
      {indeterminate.length > 0 ? (
        <>
          <h3 className="map-tier-heading">We can’t put these either way — and that’s your call</h3>
          <ol className="map-tier map-tier-indeterminate">
            {indeterminate.map((entry) => (
              <li key={entry.programId} className="map-entry">
                <span className="map-entry-name">{nameOf(entry)}</span>
                <span className="map-entry-reason">{reasonForNoFigure(entry)}</span>
              </li>
            ))}
          </ol>
        </>
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
  // The outcome is tested first, and the order is load-bearing rather than
  // stylistic. HUSKY will arrive carrying `noFigureReason: "coverage-not-cash"`,
  // and an Indeterminate HUSKY tested the other way round would render
  // "Coverage, not cash" — the indeterminacy would simply disappear. A reason a
  // figure is missing only makes sense once there is an outcome to price.
  //
  // Named plainly, and not as a category: it says which fact, and it says the
  // Resident was right to keep it if they did (CONTEXT.md, *Elicitation*;
  // ADR-0004).
  if (entry.outcome === "indeterminate") {
    return "We can’t put this one either way without knowing about immigration status — and you don’t have to tell us.";
  }

  if (entry.noFigureReason === "coverage-not-cash") return "Coverage, not cash — no dollar figure to give.";
  if (entry.noFigureReason === "waitlisted" && entry.waitlist) {
    return `There is a queue — about ${entry.waitlist.typicalWaitMonths} months. Your place is set by your application date, so apply now.`;
  }

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
