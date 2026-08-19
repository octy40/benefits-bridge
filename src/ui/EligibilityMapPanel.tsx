import type { ScreeningResult } from "@/rules/types";
import type { Language } from "./copy";
import { eligibilityMapView, type MapGroup, type ReasonEntry } from "./eligibility-map-view";

/**
 * The eligibility map.
 *
 * It renders from `ScreeningResult` and from nothing else. There is deliberately
 * no prop, no context and no other path by which model-authored text could
 * reach this panel — which is what makes "the AI never produces a dollar figure"
 * a structural fact rather than prompt discipline (ADR-0001).
 *
 * The language is the second half of the same fact. Because every word on this
 * panel is either the translation table's or `money.ts`'s, flipping it is a
 * re-render: no round trip, nothing to re-translate, nothing that can come back
 * different. `eligibility-map-view.ts` does the deciding and is tested; what is
 * left here is layout.
 *
 * Two tiers, per CONTEXT.md: entries carrying a defensible figure sum to the
 * headline; entries with no figure sit beneath it, each carrying its own reason.
 * Indeterminate entries are neither, and are grouped apart from both — a
 * Program BenefitBridge cannot place is not a smaller version of one it can.
 */
export function EligibilityMapPanel({
  screening,
  language,
}: {
  screening: ScreeningResult;
  language: Language;
}) {
  const map = eligibilityMapView(screening, language);

  return (
    <aside className="map" aria-label={map.label}>
      <div className="map-headline">
        <p className="map-headline-label">{map.headline.label}</p>
        <p className="map-headline-total">{map.headline.total}</p>
        <p className="map-headline-note">{map.headline.note}</p>
      </div>

      {map.empty ? <p className="map-empty">{map.empty}</p> : null}

      {map.groups.map((group, index) => (
        <EntryGroup key={group.heading ?? index} group={group} />
      ))}

      <p className="map-caveat">{map.caveat}</p>
    </aside>
  );
}

function EntryGroup({ group }: { group: MapGroup }) {
  return (
    <section className="map-group">
      {/*
        The Keychain is the group that announces itself, because nobody
        administers these together — same rendering, different grouping
        (CONTEXT.md, *Keychain*).
      */}
      {group.heading ? <h2 className="map-group-heading">{group.heading}</h2> : null}

      {group.withFigures.length > 0 ? (
        <ol className="map-tier">
          {group.withFigures.map((entry) => (
            <li key={entry.programId} className="map-entry">
              <span className="map-entry-name">
                {entry.name}
                {entry.provisional ? (
                  <span className="map-entry-provisional">{entry.provisional}</span>
                ) : null}
              </span>
              <span className="map-entry-figure">{entry.figure}</span>
              <span className="map-entry-basis">{entry.detail}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {group.withoutFigures.length > 0 ? (
        <ol className="map-tier map-tier-two">
          {group.withoutFigures.map((entry) => (
            <ReasonLine key={entry.programId} entry={entry} />
          ))}
        </ol>
      ) : null}

      {/*
        Its own heading and modifier class, so an entry BenefitBridge cannot
        place is visibly not one of the things above it. The heading carries the
        choice back to the Resident rather than leaving it in a sentence they may
        not read (ADR-0004).
      */}
      {group.indeterminate.length > 0 ? (
        <>
          <h3 className="map-tier-heading">{group.indeterminateHeading}</h3>
          <ol className="map-tier map-tier-indeterminate">
            {group.indeterminate.map((entry) => (
              <ReasonLine key={entry.programId} entry={entry} />
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

function ReasonLine({ entry }: { entry: ReasonEntry }) {
  return (
    <li className="map-entry">
      <span className="map-entry-name">{entry.name}</span>
      <span className="map-entry-reason">{entry.reason}</span>
    </li>
  );
}
