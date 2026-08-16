# The model quotes figures but never computes them

Every eligibility map handed to the model carries its figures already derived — monthly
and annual per Program, the tier-1 headline total, the delta from the previous map — and
is stamped with a sequence number declaring that figures in earlier tool results are
superseded.

## Context

[[0001-model-elicits-code-decides]] says the model never produces a dollar figure of its
own. Withholding figures from the model entirely was the obvious way to enforce that, and
it was rejected: on SMS and voice there is no eligibility map to look at, so a conversation
that cannot speak the numbers cannot be the product on the channels the access story
treats as the equity commitment.

The risk was also misdiagnosed at first. Misquotation is not the danger — transcribing a
number that is sitting in context is reliable. The dangers are the arithmetic the model is
drawn into doing *next* (annualizing a monthly allotment, summing a headline, comparing to
a threshold), and stale maps: tool results accumulate, and BenefitBridge's central
demonstration is a household composition change that moves SNAP from one figure to
another, leaving both in the window with nothing marking the first one dead.

## Consequences

Adding a figure to the eligibility map means adding every derived form of it the
conversation might plausibly need, rather than letting the model divide by twelve. That is
more surface than it looks and is the price of the guarantee.

Superseded maps are marked in place rather than pruned, because rewriting conversation
history invalidates the prompt cache from that point on, and [[0006-thinking-stays-on]]
has already spent the latency budget.
