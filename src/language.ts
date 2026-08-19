/**
 * The languages BenefitBridge is offered in.
 *
 * One table, and the only place in the product that knows how many languages
 * there are. Adding one means adding a row here and a column to `ui/copy.ts` —
 * nothing else counts them (ADR-0013).
 *
 * It sits above both the interface and the conversation because both need it
 * for different halves of the same tap: the interface reads `endonym` to label
 * the toggle, and the system prompt reads `spokenName` to tell the model what
 * to speak.
 */

export type Language = "en" | "es";

export const LANGUAGES: readonly {
  code: Language;
  /**
   * The language named in itself. A Resident looking for Spanish is looking for
   * "Español", not for whatever the language they are currently reading calls
   * it, so this is the one string the toggle never translates.
   */
  endonym: string;
  /** How the language is named to the model. Never Resident-facing. */
  spokenName: string;
}[] = [
  { code: "en", endonym: "English", spokenName: "English" },
  { code: "es", endonym: "Español", spokenName: "Spanish (español)" },
];

export function spokenName(language: Language): string {
  return LANGUAGES.find((entry) => entry.code === language)!.spokenName;
}
