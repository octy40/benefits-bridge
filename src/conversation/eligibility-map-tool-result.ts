import { formatMoney, formatMoneyDelta } from "@/money";
import type { ProgramResult, ScreeningResult } from "@/rules/types";

/**
 * What the model sees after every `record_household_facts` call.
 *
 * Two rules shape it, both from ADR-0010:
 *
 *  - every figure arrives already derived, as a formatted amount, so the model
 *    transcribes rather than computes — no annualizing a monthly allotment, no
 *    summing a headline, no comparing against a threshold;
 *  - every result is stamped with a `sequence` and says out loud that figures
 *    in lower-sequence results are dead. Superseded maps are marked in place
 *    rather than pruned, because rewriting conversation history invalidates the
 *    prompt cache from that point on and ADR-0006 already spent the latency.
 */
export type EligibilityMapToolResult = {
  sequence: number;
  supersedes: string;
  asOf: string;
  headlineAnnualTotal: string;
  changeSincePreviousMap: {
    headlineAnnualTotal: string;
    programsAdded: string[];
    programsRemoved: string[];
    figuresChanged: { programId: string; from: string; to: string }[];
  };
  programs: EligibilityMapEntry[];
  keychain: EligibilityMapEntry[];
  blockingFacts: { factId: string; blocksPrograms: string[]; blocksCount: number }[];
};

export type EligibilityMapEntry = {
  programId: string;
  outcome: string;
  countedMembers: string[];
  annual?: string;
  monthly?: string;
  noFigureReason?: string;
  waitlist?: { typicalWaitMonths: number; invitingApplicationsReceivedBy: string };
  blockedBy: string[];
};

export function buildEligibilityMapToolResult(
  current: ScreeningResult,
  previous: ScreeningResult,
): EligibilityMapToolResult {
  return {
    sequence: current.sequence,
    supersedes:
      `This is eligibility map ${current.sequence}. It supersedes every earlier eligibility map ` +
      `in this conversation: any figure from a result with a sequence below ${current.sequence} ` +
      `is out of date and must not be quoted to the Resident.`,
    asOf: current.asOf,
    headlineAnnualTotal: formatMoney(current.headlineAnnualTotal),
    changeSincePreviousMap: describeChange(current, previous),
    programs: current.programs.map(toEntry),
    keychain: current.keychain.map(toEntry),
    blockingFacts: current.blockingFacts.map((fact) => ({
      factId: fact.factId,
      blocksPrograms: fact.blocks,
      blocksCount: fact.blocks.length,
    })),
  };
}

function toEntry(program: ProgramResult): EligibilityMapEntry {
  return {
    programId: program.programId,
    outcome: program.outcome,
    countedMembers: program.unit,
    // Passed through, never derived. A monthly figure that is not the rules
    // module's own is a number nobody can defend — a SNAP allotment is a
    // monthly amount times twelve, not an annual amount divided by it. If the
    // conversation needs a derived form, it gets added behind `screen`
    // (ADR-0010, ADR-0011).
    ...(program.figures ? { annual: formatMoney(program.figures.annual) } : {}),
    ...(program.figures?.monthly !== undefined
      ? { monthly: formatMoney(program.figures.monthly) }
      : {}),
    ...(program.noFigureReason ? { noFigureReason: program.noFigureReason } : {}),
    ...(program.waitlist ? { waitlist: program.waitlist } : {}),
    blockedBy: program.blockedBy,
  };
}

function describeChange(
  current: ScreeningResult,
  previous: ScreeningResult,
): EligibilityMapToolResult["changeSincePreviousMap"] {
  // There is always a previous map: a conversation opens on an empty one at
  // sequence 0, so the first Program to appear shows up as an addition and a
  // headline that moved, rather than as a special case.
  const before = byProgramId(previous);
  const after = byProgramId(current);

  const programsAdded = [...after.keys()].filter((id) => !before.has(id));
  const programsRemoved = [...before.keys()].filter((id) => !after.has(id));

  const figuresChanged = [...after.entries()].flatMap(([id, program]) => {
    const was = before.get(id);
    if (!was?.figures || !program.figures) return [];
    if (was.figures.annual === program.figures.annual) return [];
    return [{ programId: id, from: formatMoney(was.figures.annual), to: formatMoney(program.figures.annual) }];
  });

  return {
    headlineAnnualTotal: formatMoneyDelta(current.headlineAnnualTotal - previous.headlineAnnualTotal),
    programsAdded,
    programsRemoved,
    figuresChanged,
  };
}

function byProgramId(result: ScreeningResult): Map<string, ProgramResult> {
  return new Map([...result.programs, ...result.keychain].map((program) => [program.programId, program]));
}
