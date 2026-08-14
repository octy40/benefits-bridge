# The model elicits; code decides

BenefitBridge's conversation is driven by an LLM, but eligibility is not. The model runs
the conversation with the Resident and extracts a structured household profile; a
deterministic rules module computes which Programs the household is likely eligible for
and what they are worth; the model then narrates that result back. The model never
decides eligibility and never produces a dollar figure of its own.

## Considered options

Letting the model decide eligibility directly from program rules written into its prompt
was the faster path, and it was rejected. Dollar values are the product's central
evidence — they appear on the eligibility map and in the pitch — and a model doing
threshold arithmetic live will eventually produce a number nobody can defend. A rules
module is also testable in a way a prompt is not.

## Consequences

The split is load-bearing for the product's credibility claim, not just its correctness:
the AI does the genuinely hard part (turning "rent is killing me and my mom moved in"
into structured facts, and knowing what to ask next), while arithmetic any deterministic
system could do stays deterministic. Adding a Program therefore means writing code, not
editing a prompt — deliberately so.
