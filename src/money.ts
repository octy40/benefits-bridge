import type { Money } from "@/rules/types";

/**
 * The only place cents become something a person reads. Every figure the model
 * is shown passes through here, so the model quotes a string it cannot be
 * tempted to do arithmetic on (ADR-0010).
 */
export function formatMoney(cents: Money): string {
  const dollars = Math.round(cents / 100);
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${Math.abs(dollars).toLocaleString("en-US")}`;
}

/** A signed change, phrased so it reads as movement rather than a new total. */
export function formatMoneyDelta(cents: Money): string {
  const dollars = Math.round(cents / 100);
  if (dollars === 0) return "no change";
  return dollars > 0 ? `+${formatMoney(cents)}` : formatMoney(cents);
}

/**
 * Whether a change survives being rounded to the dollars a Resident reads.
 *
 * The one case `formatMoneyDelta` answers with a *word* rather than an amount
 * is the one where nothing moved — and that word is written in English, which
 * is the single thing ADR-0013 keeps off the eligibility map. A caller that
 * must not render it asks here rather than testing the cents itself: forty
 * cents is not zero, and a caller comparing against zero would print
 * "no change" onto a Spanish panel.
 */
export function moneyDeltaIsVisible(cents: Money): boolean {
  return Math.round(cents / 100) !== 0;
}
