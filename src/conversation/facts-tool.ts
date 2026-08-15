import type {
  HouseholdProfile,
  IncomePeriod,
  IncomeType,
  Member,
  Money,
} from "@/rules/types";

/**
 * The one tool. It merges facts into the Household profile, calls `screen`, and
 * returns the result. Profile accumulation lives here, above the seam.
 *
 * The schema asks for dollars, never cents: turning 1,900 into 190,000 is
 * arithmetic, and arithmetic belongs in code (ADR-0010). It also offers no
 * household size (ADR-0003) and no single income figure (ADR-0009) — there is
 * nowhere for the model to put one, which is the point.
 */

export type RecordedIncomeSource = {
  type: IncomeType;
  amountDollars: number;
  period: IncomePeriod;
};

export type RecordedMember = {
  id: string;
  age?: number;
  relationship?: string;
  sharesFoodPurchaseAndPreparation?: boolean;
  incomeSources?: RecordedIncomeSource[];
};

export type RecordedFacts = {
  members?: RecordedMember[];
  town?: string;
  monthlyRentDollars?: number;
  utilitiesPaid?: string[];
  programsAlreadyReceived?: string[];
  immigrationStatusShared?: boolean;
};

export const recordHouseholdFactsTool = {
  name: "record_household_facts",
  description:
    "Record facts about the Resident's household as they come up in conversation, and get back " +
    "the updated eligibility map. Call this whenever the Resident tells you something new or " +
    "corrects something they said earlier — several facts volunteered in one sentence should all " +
    "go in one call. The result tells you what they are likely eligible for, what it is worth, " +
    "and which facts are still blocking the most Programs.",
  input_schema: {
    type: "object" as const,
    properties: {
      members: {
        type: "array",
        description:
          "One entry per household member mentioned. Use a stable id per person for the whole " +
          "conversation (e.g. 'self', 'child-1', 'mother'). Send only the fields you learned; " +
          "anything you omit is left as it was.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Stable id for this person within the conversation." },
            age: { type: "number", description: "Age in years, as the Resident stated it." },
            relationship: {
              type: "string",
              description: "Relationship to the Resident, e.g. 'self', 'child', 'mother', 'partner'.",
            },
            sharesFoodPurchaseAndPreparation: {
              type: "boolean",
              description: "Whether this person buys and prepares food together with the Resident.",
            },
            incomeSources: {
              type: "array",
              description:
                "Where this person's money comes from — not a single total. Sending this replaces " +
                "everything previously recorded for this person, so include every source you know of.",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "wages",
                      "cash-self-employment",
                      "social-security",
                      "ssi",
                      "unemployment",
                      "child-support",
                      "other",
                    ],
                  },
                  amountDollars: {
                    type: "number",
                    description: "Dollars, exactly as the Resident described it. Do not convert it.",
                  },
                  period: {
                    type: "string",
                    enum: ["hourly", "weekly", "biweekly", "monthly", "annual"],
                    description: "The period the amount is for. Do not convert between periods.",
                  },
                },
                required: ["type", "amountDollars", "period"],
              },
            },
          },
          required: ["id"],
        },
      },
      town: { type: "string", description: "The town or city the household lives in." },
      monthlyRentDollars: {
        type: "number",
        description: "Dollars of rent per month, exactly as stated. Do not convert it.",
      },
      utilitiesPaid: {
        type: "array",
        items: { type: "string" },
        description: "Which utilities the household pays separately from rent, e.g. 'heat', 'electricity'.",
      },
      programsAlreadyReceived: {
        type: "array",
        items: { type: "string" },
        description: "Benefits the household already receives, e.g. 'snap', 'husky'.",
      },
      immigrationStatusShared: {
        type: "boolean",
        description:
          "Only set this if the Resident volunteered their status after being told they may decline. " +
          "Never required — a Resident who declines still gets an eligibility map.",
      },
    },
  },
};

export function mergeFacts(profile: HouseholdProfile, facts: RecordedFacts): HouseholdProfile {
  return {
    ...profile,
    members: mergeMembers(profile.members, facts.members ?? []),
    ...definedOnly({
      town: facts.town,
      monthlyRent: toCents(facts.monthlyRentDollars),
      utilitiesPaid: facts.utilitiesPaid,
      programsAlreadyReceived: facts.programsAlreadyReceived,
      immigrationStatusShared: facts.immigrationStatusShared,
    }),
  };
}

function mergeMembers(known: Member[], reported: RecordedMember[]): Member[] {
  const merged = known.map((member) => ({ ...member }));

  for (const report of reported) {
    const { id, incomeSources, ...rest } = report;
    const existing = merged.find((member) => member.id === id);
    const update = {
      ...definedOnly(rest),
      // Re-reporting income replaces it wholesale: a Resident correcting what
      // they earn must not end up with both figures counted.
      ...(incomeSources ? { incomeSources: incomeSources.map(toIncomeSource) } : {}),
    };

    if (existing) {
      Object.assign(existing, update);
    } else {
      merged.push({ id, incomeSources: [], ...update });
    }
  }

  return merged;
}

function toIncomeSource(source: RecordedIncomeSource) {
  return { type: source.type, amount: toCents(source.amountDollars)!, period: source.period };
}

function toCents(dollars: number | undefined): Money | undefined {
  return dollars === undefined ? undefined : Math.round(dollars * 100);
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
