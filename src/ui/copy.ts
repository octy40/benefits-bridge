import type { Language } from "@/language";
import type { FactId, ProgramId } from "@/rules/types";

/**
 * The translation table.
 *
 * Everything a Resident reads that BenefitBridge — rather than the model —
 * wrote lives here, so switching language is a lookup rather than a request.
 * The eligibility map renders from `ScreeningResult` and from nothing else
 * (ADR-0001), which is what makes that possible: there is no model-authored
 * text on that panel to send away and have re-translated.
 *
 * Nothing in here produces a number. Amounts arrive already formatted by
 * `money.ts` and are interpolated verbatim, so a figure reads the same in every
 * language and translation cannot reach it. That is why the entries that carry
 * an amount are functions rather than strings with a placeholder in them: the
 * amount is a parameter, not a piece of the sentence a translator edits.
 *
 * Why the toggle never asks the model anything: ADR-0013.
 *
 * Demo scaffolding, like the rest of the interface (ADR-0011).
 */

/** One row per language, so a missing translation is missing where it is written. */
type Translated = Record<Language, string>;

/**
 * Resident-facing Program names, keyed by Program id.
 *
 * Program ids are the rules module's vocabulary and are not for reading. The id
 * is the join: adding a Program means adding one row here, in every language at
 * once, and `eligibility-map-view.test.ts` fails if one is missed.
 *
 * A Program's proper name is not translated — Care 4 Kids is called Care 4 Kids
 * in Stamford whichever language you speak, and a Resident who has to name it at
 * an agency counter needs the name the agency uses. What translates is the tail
 * that says what it is.
 */
const PROGRAM_NAMES: Record<ProgramId, Translated> = {
  snap: { en: "SNAP food assistance", es: "SNAP (asistencia alimentaria)" },
  ceap: { en: "CEAP energy assistance", es: "CEAP (ayuda con la energía)" },
  "husky-a": { en: "HUSKY A", es: "HUSKY A" },
  "husky-d": { en: "HUSKY D", es: "HUSKY D" },
  "care-4-kids": { en: "Care 4 Kids", es: "Care 4 Kids" },
  lifeline: {
    en: "Lifeline phone & internet discount",
    es: "Lifeline (descuento de teléfono e internet)",
  },
  lidr: {
    en: "Utility Low-Income Discount Rate",
    es: "Tarifa de descuento en servicios públicos para hogares de bajos ingresos",
  },
  "museums-for-all": { en: "Museums for All", es: "Museums for All" },
};

/**
 * How a fact that is holding up a *figure* is described back to the Resident.
 *
 * Only the facts that block a figure need an entry: a fact that blocks an
 * outcome keeps its Program off the map entirely, so there is no line to label.
 * Naming the specific fact is what makes an entry moving from tier 2 to tier 1
 * read as an answer arriving rather than as an estimate wobbling.
 */
const FIGURE_BLOCKER_NAMES: Partial<Record<FactId, Translated>> = {
  rent: { en: "what you pay in rent", es: "cuánto paga de alquiler" },
  "utility-costs": {
    en: "which utilities you pay for",
    es: "qué servicios públicos paga",
  },
  // A household is only ever asked this when age alone could not already
  // settle CEAP's vulnerable-household distinction.
  disability: {
    en: "whether anyone in your household has a disability",
    es: "si alguien en su hogar tiene una discapacidad",
  },
  // Reaches a figure-blocker line only through CEAP's categorical-eligibility
  // path: the household is already known likely-eligible from Program receipt,
  // and income is still what prices the figure.
  "income-sources": {
    en: "what your household brings in",
    es: "qué ingresos entran a su hogar",
  },
};

export function programName(programId: ProgramId, language: Language): string {
  return PROGRAM_NAMES[programId]?.[language] ?? programId;
}

export function figureBlockerName(factId: FactId, language: Language): string {
  return FIGURE_BLOCKER_NAMES[factId]?.[language] ?? factId;
}

export type Copy = {
  /** Not translated: it is the product's name. */
  appName: string;
  languageChooserLabel: string;
  conversationLabel: string;
  intro: string;
  opener: string;
  composerLabel: string;
  composerPlaceholder: string;
  send: string;
  working: string;
  genericFailure: string;
  map: {
    label: string;
    headlineLabel: string;
    headlineNote: string;
    /** Appended to `headlineNote` when the total includes a figure its agency calls proposed. */
    headlineProvisionalNote: string;
    empty: string;
    keychainHeading: string;
    indeterminateHeading: string;
    provisionalBadge: string;
    caveat: string;
    perYear: (amount: string) => string;
    perMonth: (amount: string) => string;
    indeterminateReason: string;
    coverageNotCash: string;
    waitlisted: (typicalWaitMonths: number) => string;
    waitingOnFacts: (facts: string) => string;
    noFigureYet: string;
    joinFacts: (facts: string[]) => string;
  };
};

const COPY: Record<Language, Copy> = {
  en: {
    appName: "BenefitBridge",
    languageChooserLabel: "Language",
    conversationLabel: "Conversation",
    intro:
      "Tell us about your household in your own words. Nothing is saved — close this tab and it is all gone.",
    opener:
      "Hi — I can help you find benefits your household may be missing. To start: who lives with you?",
    composerLabel: "Your message",
    composerPlaceholder: "Tell us about your household…",
    send: "Send",
    working: "…",
    genericFailure: "Something went wrong.",
    map: {
      label: "Eligibility map",
      headlineLabel: "Likely available to you each year",
      headlineNote: "This estimate updates as we learn more.",
      headlineProvisionalNote: " It includes a proposed figure that is not yet final.",
      empty:
        "Nothing to show yet. Tell BenefitBridge about your household and this fills in as you talk.",
      keychainHeading: "Discounts your eligibility unlocks",
      indeterminateHeading: "We can’t put these either way — and that’s your call",
      provisionalBadge: "Proposed",
      caveat:
        "BenefitBridge screens — it never decides. Only the agency running a Program can do that.",
      perYear: (amount) => `${amount} a year`,
      perMonth: (amount) => `${amount} a month`,
      indeterminateReason:
        "We can’t put this one either way without knowing about immigration status — and you don’t have to tell us.",
      coverageNotCash: "Coverage, not cash — no dollar figure to give.",
      waitlisted: (months) =>
        `There is a queue — about ${months} months. Your place is set by your application date, so apply now.`,
      waitingOnFacts: (facts) => `You likely qualify — tell us ${facts} and this gets a figure.`,
      noFigureYet: "You likely qualify — we are still working out what it is worth.",
      joinFacts: (facts) => joinWith(facts, () => "and"),
    },
  },

  es: {
    appName: "BenefitBridge",
    languageChooserLabel: "Idioma",
    conversationLabel: "Conversación",
    intro:
      "Cuéntenos sobre su hogar con sus propias palabras. No se guarda nada: al cerrar esta pestaña, todo desaparece.",
    opener:
      "Hola — puedo ayudarle a encontrar beneficios que a su hogar quizá le falten. Para empezar: ¿quiénes viven con usted?",
    composerLabel: "Su mensaje",
    composerPlaceholder: "Cuéntenos sobre su hogar…",
    send: "Enviar",
    working: "…",
    genericFailure: "Algo salió mal.",
    map: {
      label: "Mapa de elegibilidad",
      headlineLabel: "Probablemente disponible para usted cada año",
      headlineNote: "Esta estimación se actualiza a medida que sabemos más.",
      headlineProvisionalNote: " Incluye una cifra propuesta que todavía no es definitiva.",
      empty:
        "Todavía no hay nada que mostrar. Cuéntele a BenefitBridge sobre su hogar y esto se irá llenando mientras conversan.",
      keychainHeading: "Descuentos a los que su elegibilidad le da acceso",
      indeterminateHeading: "De estos no podemos decir ni que sí ni que no — y esa decisión es suya",
      provisionalBadge: "Propuesta",
      // "Evaluación preliminar", never "decisión": BenefitBridge screens, and
      // the Spanish has to hold that line as firmly as the English does
      // (CONTEXT.md, *Screening*).
      caveat:
        "BenefitBridge hace una evaluación preliminar; nunca decide. Solo la agencia que administra un Programa puede decidir.",
      perYear: (amount) => `${amount} al año`,
      perMonth: (amount) => `${amount} al mes`,
      indeterminateReason:
        "De este no podemos decir ni que sí ni que no sin saber sobre el estatus migratorio — y usted no tiene que decírnoslo.",
      coverageNotCash: "Es cobertura, no dinero — no hay una cifra en dólares que podamos dar.",
      waitlisted: (months) =>
        `Hay una lista de espera — de unos ${months} meses. Su lugar lo fija la fecha de su solicitud, así que solicítelo ahora.`,
      waitingOnFacts: (facts) => `Probablemente califica — cuéntenos ${facts} y esto tendrá una cifra.`,
      noFigureYet: "Probablemente califica — todavía estamos calculando cuánto vale.",
      joinFacts: (facts) => joinWith(facts, spanishAnd),
    },
  },
};

export function copyFor(language: Language): Copy {
  return COPY[language];
}

/** The conjunction is a function of what follows it, because in Spanish it is. */
function joinWith(phrases: string[], conjunction: (following: string) => string): string {
  if (phrases.length <= 1) return phrases.join("");
  const last = phrases[phrases.length - 1];
  return `${phrases.slice(0, -1).join(", ")} ${conjunction(last)} ${last}`;
}

/**
 * "y", except before a word that starts with the *sound* i — where it becomes
 * "e", to keep the two vowels from running together. "hie-" is the exception to
 * the exception: "hielo" opens on a consonantal glide, so "y hielo" is right.
 *
 * No blocking fact triggers it today. It is here because a table this small
 * either encodes the language's rules or quietly gets them wrong the first time
 * someone adds a phrase, and the phrase that would break it — anything opening
 * on *ingresos* — is one row away.
 */
function spanishAnd(following: string): string {
  const word = following.toLowerCase();
  if (word.startsWith("hie")) return "y";
  return word.startsWith("i") || word.startsWith("hi") ? "e" : "y";
}
