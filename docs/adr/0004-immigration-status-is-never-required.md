# Immigration status is never required

BenefitBridge may ask about immigration status, always optionally and always with a
stated reason, and a Resident who declines still gets an eligibility map. Programs whose
rules turn on status are reported as **Indeterminate** rather than guessed at in either
direction.

## Context

31.1% of Stamford residents are foreign-born, many households are mixed-status, and fear
of being asked is itself a documented barrier to claiming benefits people are legally
entitled to. A screener that requires status turns that fear into an exit; one that
ignores status entirely tells people they qualify for things they do not.

## Consequences

Screening needs a third outcome — `Indeterminate` — which exists solely because of this
decision and would otherwise look like an unnecessary state. For the common case of a
mixed-status family with citizen children, most of the dollar value sits in
status-blind Programs, so declining costs the Resident little.

That last sentence is only true when status is evaluated **per member**, so that a Program
can be scored for citizen children while a parent is Indeterminate. The first
implementation does not do this: it asks one optional household-level question and sends
the status-dependent Programs to Indeterminate wholesale when it goes unanswered. The
coarse version is honest — it never claims eligibility it cannot support — but it
overstates what declining costs, and per-member evaluation is the correction, not an
enhancement.

## Amendment, 2026-08-17: by how much it overstates, and one cost not previously stated

**On the Program list BenefitBridge actually screens, "most of the dollar value sits in
status-blind Programs" is close to false.** SNAP, CT EITC, federal HUSKY, Care 4 Kids and
CEAP are all status-dependent; the CT Elderly/Disabled Renters' Rebate is the only
genuinely status-blind Program on the list, and it serves elderly and disabled renters
rather than the mixed-status family this decision is about. Meanwhile **four** of those
five status-dependent Programs are, in law, available to a mixed-status family with
citizen children:

- **SNAP** — the children are eligible. The ineligible member is dropped from the Program
  unit and their income is still counted against the smaller unit's limit
  (7 CFR 273.11(c)(3)).
- **State HUSKY A / HUSKY B for Children** — covers uninsured children aged 0–15 to 323%
  FPL *because* they lack a qualifying immigration status.
- **Care 4 Kids** — only the child's status is tested; "the citizenship status of the
  child's parents or other family members is not taken into consideration" (CT OEC).
- **CEAP** — same structure as SNAP: non-qualified members are excluded from the household
  but other members may be eligible, and the excluded member's income is still counted
  (FFY2027 LIHEAP allocation plan, §V.J–K).

So for the household this decision exists to protect, sending status-dependent Programs to
Indeterminate wholesale erases close to the entire map, where the correct answer is "your
children are likely eligible for four of these". That is an argument for prioritising
per-member evaluation, not for requiring status. Sources are in
`docs/ct-program-facts.md` §8.

**A second cost, accepted with open eyes.** An unasked status scores normally: a household
nobody has asked is screened on income, with figures, exactly as if everyone qualified.
Status bites only once the question has been put. The consequence is that a Resident who
is asked and **declines** ends up with a worse map than one who was never asked — the same
household, the same facts, a smaller headline for having exercised the choice
BenefitBridge offered them. That cuts against the very fear this ADR exists to defuse, and
it is not softened here. The alternative — Indeterminate until somebody affirmatively says
everyone qualifies — was rejected because it holds every map at $0 from the first turn and
so withholds from everyone what this withholds only from the Resident who declined. Both
options are bad; per-member evaluation is the only thing that removes the choice between
them.
