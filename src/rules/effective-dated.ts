import type { IsoDate } from "./types";

/**
 * Every figure table in the rules module is a list of these, and `screen`
 * selects from it by its `asOf` parameter — never by reading the clock.
 *
 * Superseded rows stay in the tree rather than being edited in place. That is
 * what makes SNAP's FY2027 figures landing on October 1 a data change rather
 * than a code change, and it is what lets a test assert both sides of a
 * fiscal-year boundary without time travel.
 */
export type EffectiveDated<T> = {
  effectiveFrom: IsoDate;
  /**
   * Inclusive last day the row is in force. Present whenever the agency has
   * published an end date — a row left open-ended keeps quoting its figures
   * forever, which is how a screener sends someone to an office with last
   * year's number.
   */
  effectiveTo?: IsoDate;
  value: T;
};

/**
 * The row in force on `asOf`, or `undefined` when no published row covers it.
 *
 * `undefined` is a real answer, not an error to paper over: as of the FY2026
 * table below, USDA has not published FY2027 SNAP figures, and a Program with
 * no figures in force is one BenefitBridge cannot screen rather than one it
 * screens with stale numbers.
 *
 * ISO 8601 dates compare correctly as strings, which is the only reason this
 * module needs no date library.
 */
export function inForceOn<T>(rows: EffectiveDated<T>[], asOf: IsoDate): T | undefined {
  return rows.find(
    (row) => asOf >= row.effectiveFrom && (row.effectiveTo === undefined || asOf <= row.effectiveTo),
  )?.value;
}
