import type { IncomeSource, Money } from "./types";

/**
 * Income derivation: turning a list of sources into the monthly figure a
 * Program's income test wants.
 *
 * It deliberately does not know what *counts*. Which sources go in is the
 * Program's decision and differs between them — SNAP splits earned from
 * unearned, EITC ignores Social Security entirely, the renters' rebate counts
 * it in full (ADR-0009). This module is handed the sources a Program already
 * decided to count and does the arithmetic on them.
 */

/** Weeks a year, per the periods the agencies themselves convert with. */
const WEEKS_PER_MONTH = 52 / 12;

/**
 * `undefined` when the source cannot be converted yet — an hourly rate with no
 * hours against it. A caller that treats it as zero has quietly decided a
 * Resident earns nothing, which is the error that puts a household on the map
 * with a figure nobody can defend.
 */
export function monthlyAmount(source: IncomeSource): Money | undefined {
  switch (source.period) {
    case "hourly":
      if (source.hoursPerWeek === undefined) return undefined;
      return Math.round(source.amount * source.hoursPerWeek * WEEKS_PER_MONTH);
    case "weekly":
      return Math.round(source.amount * WEEKS_PER_MONTH);
    case "biweekly":
      return Math.round((source.amount * 26) / 12);
    case "monthly":
      return source.amount;
    case "annual":
      return Math.round(source.amount / 12);
  }
}

/** `undefined` if any one source is not yet convertible — see `monthlyAmount`. */
export function monthlyTotal(sources: IncomeSource[]): Money | undefined {
  let total = 0;

  for (const source of sources) {
    const monthly = monthlyAmount(source);
    if (monthly === undefined) return undefined;
    total += monthly;
  }

  return total;
}

/** Whether an hourly source is still waiting on the hours that make it money. */
export function needsWorkHours(sources: IncomeSource[]): boolean {
  return sources.some((source) => source.period === "hourly" && source.hoursPerWeek === undefined);
}
