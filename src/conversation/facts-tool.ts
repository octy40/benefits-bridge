import type {
  HouseholdProfile,
  ImmigrationStatusAnswer,
  IncomePeriod,
  IncomeType,
  Member,
  Money,
  UtilityPaid,
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
  hoursPerWeek?: number;
};

export type RecordedMember = {
  id: string;
  age?: number;
  relationship?: string;
  sharesFoodPurchaseAndPreparation?: boolean;
  hasDisability?: boolean;
  incomeSources?: RecordedIncomeSource[];
};

export type RecordedFacts = {
  members?: RecordedMember[];
  town?: string;
  monthlyRentDollars?: number;
  utilitiesPaid?: UtilityPaid[];
  programsAlreadyReceived?: string[];
  immigrationStatus?: ImmigrationStatusAnswer;
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
            hasDisability: {
              type: "boolean",
              description:
                "Whether this person has a disability. Only ask this when it is still needed to price a " +
                "figure — a household with a member 60+ or a child under 6 never needs this asked at all.",
            },
            incomeSources: {
              type: "array",
              description:
                "Where this person's money comes from — not a single total. Sending this replaces " +
                "everything previously recorded for this person, so include every source you know of. " +
                "Send an empty array for someone who has no income at all, including a young child: " +
                "leaving this out means nobody has asked yet, and Screening keeps waiting on it.",
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
                  hoursPerWeek: {
                    type: "number",
                    description:
                      "Hours worked in a typical week. Required when period is 'hourly' and " +
                      "ignored otherwise. Do not multiply it out yourself.",
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
        description:
          "Dollars of rent per month, exactly as stated. Do not convert it. Needed to work out " +
          "what SNAP is worth, so a household that has not given it yet shows up with no figure.",
      },
      utilitiesPaid: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "heat",
            "air-conditioning",
            "electricity",
            "gas",
            "water",
            "sewer",
            "trash",
            "phone",
            "internet",
          ],
        },
        description:
          "Which utilities the household pays for separately from their rent. Whether they pay " +
          "for heating matters most, so ask about it rather than about 'utilities'. Send an empty " +
          "array for a household whose rent covers everything: leaving this out means nobody has " +
          "asked yet, and SNAP keeps waiting on it before it can show a figure.",
      },
      programsAlreadyReceived: {
        type: "array",
        items: { type: "string" },
        description:
          "Benefits the household already receives, e.g. 'snap', 'husky', 'tfa', 'ssi', " +
          "'refugee-cash-assistance', 'state-supplement', 'medicaid', 'federal-public-housing-assistance', " +
          "'veterans-pension', 'section-8'. A household already receiving SNAP, TFA, Refugee Cash " +
          "Assistance, State Supplement, or SSI does not need to prove its income again for CEAP energy " +
          "assistance, and several of these also unlock Keychain discounts on their own — recording " +
          "this is what unlocks all of that.",
      },
      immigrationStatus: {
        type: "string",
        enum: ["declined", "all-qualifying", "mixed"],
        description:
          "The household's answer to the optional immigration status question, and only ever set " +
          "after you have actually put that question with its reason stated. Never required — a " +
          "Resident who declines still gets an eligibility map. Use 'all-qualifying' when everyone " +
          "in the household has a status the Programs recognise, 'mixed' when at least one person " +
          "does not, and 'declined' whenever you ask and do not get an answer — including when the " +
          "Resident changes the subject, says they would rather not, or says nothing about it. " +
          "Recording 'declined' is what closes the question; leaving this out after asking makes " +
          "it look as though nobody has asked.",
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
      // Recorded like any other fact, and read by the rules module like any
      // other fact. Nothing here forces the model to record `"declined"` when
      // it asks and gets no answer — that gap is real and named rather than
      // papered over (the tool schema asks for it; `statusQuestionOffered` in
      // `agent-loop.ts` is what stops the question being put twice regardless).
      immigrationStatus: facts.immigrationStatus,
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
      // No empty income list for a member nobody has asked about yet. `[]`
      // means "asked, and they have none" and would unblock Screening on a
      // fact the conversation never went and got.
      merged.push({ id, ...update });
    }
  }

  return merged;
}

function toIncomeSource(source: RecordedIncomeSource) {
  return {
    type: source.type,
    amount: toCents(source.amountDollars)!,
    period: source.period,
    ...(source.period === "hourly" && source.hoursPerWeek !== undefined
      ? { hoursPerWeek: source.hoursPerWeek }
      : {}),
  };
}

function toCents(dollars: number | undefined): Money | undefined {
  return dollars === undefined ? undefined : Math.round(dollars * 100);
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
