import type { Language } from "@/language";
import { formatMoney } from "@/money";
import type { ProgramId, ProgramResult, ScreeningResult } from "@/rules/types";
import { copyFor, figureBlockerName, programName, type Copy } from "./copy";

/**
 * The eligibility map, resolved into the exact strings a Resident reads.
 *
 * A pure function of a `ScreeningResult` and a language, which is the whole
 * point: the panel renders from this and from nothing else, so flipping the
 * language is a re-render and never a question put to the model. That falls
 * straight out of ADR-0001 — the map's contents are the rules module's, and
 * there is no model-authored text on it to go and re-translate.
 *
 * Every amount is `money.ts`'s output, interpolated into a sentence the
 * translation table supplies. No language ever reformats one (ADR-0013).
 */

export type MapView = {
  label: string;
  headline: { label: string; total: string; note: string };
  /** Present only when there is nothing on the map yet. */
  empty?: string;
  groups: MapGroup[];
  caveat: string;
};

export type MapGroup = {
  /** Absent on the Programs group; the Keychain is the one that announces itself. */
  heading?: string;
  withFigures: FigureEntry[];
  withoutFigures: ReasonEntry[];
  /** Present only when `indeterminate` has something under it to head. */
  indeterminateHeading?: string;
  indeterminate: ReasonEntry[];
};

export type FigureEntry = {
  programId: ProgramId;
  name: string;
  /** The badge text, present only on a figure its own agency has not finalised. */
  provisional?: string;
  /** e.g. "$6,876 a year". */
  figure: string;
  /** e.g. "$573 a month · FY2026". Empty when the entry carries neither. */
  detail: string;
};

export type ReasonEntry = { programId: ProgramId; name: string; reason: string };

export function eligibilityMapView(screening: ScreeningResult, language: Language): MapView {
  const copy = copyFor(language).map;

  // A Program the household is likely ineligible for is left off rather than
  // listed with a zero, so the map stays a list of things to do.
  const programs = screening.programs.filter((entry) => entry.outcome !== "likely-ineligible");
  const keychain = screening.keychain.filter((entry) => entry.outcome !== "likely-ineligible");

  return {
    label: copy.label,
    headline: {
      label: copy.headlineLabel,
      total: formatMoney(screening.headlineAnnualTotal),
      note:
        copy.headlineNote +
        (screening.headlineAnnualTotalProvisional ? copy.headlineProvisionalNote : ""),
    },
    ...(programs.length === 0 && keychain.length === 0 ? { empty: copy.empty } : {}),
    groups: [
      group(programs, copy, language),
      // The Keychain is grouped separately because nobody administers these
      // together, not because they are computed differently — same rendering,
      // different grouping (CONTEXT.md, *Keychain*).
      group(keychain, copy, language, copy.keychainHeading),
    ].filter((entry) => entry !== undefined),
    caveat: copy.caveat,
  };
}

function group(
  entries: ProgramResult[],
  copy: Copy["map"],
  language: Language,
  heading?: string,
): MapGroup | undefined {
  if (entries.length === 0) return undefined;

  // Split on `outcome` before splitting on `figures`. An Indeterminate entry
  // also has no figure, and grouped by figures alone it would sit in the
  // tier-2 list looking exactly like a Program the household likely qualifies
  // for and is merely waiting on a number for — under a headline that says
  // "Likely available to you each year", which reads as a win. They are
  // opposite things and get opposite treatment (CONTEXT.md, *Indeterminate*).
  const indeterminate = entries.filter((entry) => entry.outcome === "indeterminate");
  const scored = entries.filter((entry) => entry.outcome !== "indeterminate");

  return {
    ...(heading ? { heading } : {}),
    withFigures: scored
      .filter((entry) => entry.figures)
      .map((entry) => figureEntry(entry, copy, language)),
    withoutFigures: scored
      .filter((entry) => !entry.figures)
      .map((entry) => reasonEntry(entry, copy, language)),
    ...(indeterminate.length > 0 ? { indeterminateHeading: copy.indeterminateHeading } : {}),
    indeterminate: indeterminate.map((entry) => reasonEntry(entry, copy, language)),
  };
}

function figureEntry(entry: ProgramResult, copy: Copy["map"], language: Language): FigureEntry {
  const figures = entry.figures!;

  return {
    programId: entry.programId,
    name: programName(entry.programId, language),
    // A caption is prose a reader has to interpret; `provisional` is a fact
    // this view acts on directly (ADR-0010). CEAP's FFY2027 season is the
    // first figure carrying it.
    ...(figures.provisional ? { provisional: copy.provisionalBadge } : {}),
    figure: copy.perYear(formatMoney(figures.annual)),
    // A monthly amount divided out of an annual one would be a number nobody
    // can defend, so an entry that carries no monthly figure simply does not
    // show one (ADR-0010). The period is here because "$573 a month" invites
    // "as of when?", and the answer should be on screen.
    detail: [
      figures.monthly === undefined ? undefined : copy.perMonth(formatMoney(figures.monthly)),
      figures.basis,
    ]
      .filter((part) => part !== undefined)
      .join(" · "),
  };
}

function reasonEntry(entry: ProgramResult, copy: Copy["map"], language: Language): ReasonEntry {
  return {
    programId: entry.programId,
    name: programName(entry.programId, language),
    reason: reasonForNoFigure(entry, copy, language),
  };
}

function reasonForNoFigure(entry: ProgramResult, copy: Copy["map"], language: Language): string {

  // The outcome is tested first, and the order is load-bearing rather than
  // stylistic. HUSKY carries `noFigureReason: "coverage-not-cash"`, and an
  // Indeterminate HUSKY tested the other way round would render "Coverage, not
  // cash" — the indeterminacy would simply disappear. A reason a figure is
  // missing only makes sense once there is an outcome to price.
  if (entry.outcome === "indeterminate") return copy.indeterminateReason;

  if (entry.noFigureReason === "coverage-not-cash") return copy.coverageNotCash;
  if (entry.noFigureReason === "waitlisted" && entry.waitlist) {
    return copy.waitlisted(entry.waitlist.typicalWaitMonths);
  }

  // "Likely qualify", never "qualify": BenefitBridge screens, and only the
  // agency running a Program can decide that anyone qualifies (CONTEXT.md,
  // *Screening*).
  const waitingOn = entry.blockedBy.map((factId) => figureBlockerName(factId, language));
  if (waitingOn.length > 0) return copy.waitingOnFacts(copy.joinFacts(waitingOn));

  return copy.noFigureYet;
}
