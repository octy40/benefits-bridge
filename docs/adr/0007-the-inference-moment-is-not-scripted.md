# The inference moment is not scripted

The demo turns on a Resident mentioning in passing that her mother moved in, and
BenefitBridge responding with Programs she never asked about. That response is produced by
the rules module reacting to a new member in the Household profile — never by a hardcoded
trigger, even though `docs/market-research.md` §11 assigns the Developer to "script the
inference moment so it fires reliably."

## Considered options

Scripting the moment is materially more reliable in front of a room, and it was rejected.
The claim being made to judges at that exact beat is "real AI inference, not a decision
tree" ([[0001-model-elicits-code-decides]], [[0002-rules-module-drives-elicitation]]), and
a hardcoded trigger makes that claim false at the one moment it is being asserted.

The rules module also produces a better moment than a script can, because a script only
delivers the consequence somebody thought to write. A member aged 65+ joining the
Household profile unlocks the elderly renters' rebate — the intended beat — *and* removes
the excess-shelter-deduction cap from the SNAP Program unit, which for a Stamford renter
can drive net income to zero and the allotment to the household maximum. The second
consequence is not in anyone's script. It is in the rules.

## Consequences

The moment can fail live, and there is no way to force it. The mitigations are a rehearsed
transcript, the fixture entry point in [[0005-nothing-is-stored]], and the recorded
backup — not a trigger. Anyone later tempted to "just make sure it fires" should understand
they are removing the thing being demonstrated.
