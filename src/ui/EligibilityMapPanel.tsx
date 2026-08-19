import type { Language } from "@/language";
import type { ScreeningResult } from "@/rules/types";
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
 *
 * `previous` is the map this one replaced, and it is the whole of how the
 * demo's central beat is rendered. When a Resident mentions that her mother
 * moved in, a Program appears and another Program's figure changes at the same
 * moment (ADR-0007) — and a panel that simply swapped its contents would show
 * both happening and neither being noticed. The lines that moved carry a badge
 * and animate in; the seven that did not sit still, so there is something to
 * look at rather than everything to look at. `eligibility-map-view.ts` decides
 * *what* moved, from two `ScreeningResult`s and nothing else; this file only
 * decides how long it takes to say so.
 */
export function EligibilityMapPanel({
  screening,
  previous,
  language,
}: {
  screening: ScreeningResult;
  previous?: ScreeningResult;
  language: Language;
}) {
  const map = eligibilityMapView(screening, language, previous);

  return (
    <aside className="map" aria-label={map.label}>
      <div className="map-headline">
        <p className="map-headline-label">{map.headline.label}</p>
        <p className="map-headline-total">{map.headline.total}</p>
        {/*
          Announced politely rather than assertively: the Resident is reading
          the transcript when this lands, and a live region that interrupts is
          worse than one they reach a moment later.
        */}
        {map.headline.change ? (
          <p className="map-headline-change" aria-live="polite">
            {map.headline.change}
          </p>
        ) : null}
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
            /*
              The change class is what animates. It is present from the moment
              this map replaces the last one until the next map arrives, so the
              reveal plays once — a CSS animation runs when its class appears,
              not on every re-render — and the badge then stays as a marker of
              which line moved, rather than pulsing at a Resident trying to read
              it.
            */
            <li key={entry.programId} className={entryClass(entry.change)}>
              <span className="map-entry-name">
                {entry.name}
                {entry.provisional ? (
                  <span className="map-entry-provisional">{entry.provisional}</span>
                ) : null}
                {entry.change ? <span className="map-entry-change">{entry.change}</span> : null}
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
    <li className={entryClass(entry.change)}>
      <span className="map-entry-name">
        {entry.name}
        {entry.change ? <span className="map-entry-change">{entry.change}</span> : null}
      </span>
      <span className="map-entry-reason">{entry.reason}</span>
    </li>
  );
}

function entryClass(change: string | undefined): string {
  return change ? "map-entry map-entry-moved" : "map-entry";
}
