# The rules module drives Elicitation

The model does not decide what to ask a Resident. The rules module reports which facts
are missing from the Household profile and which Programs those facts are blocking, and
the model chooses only how and whether to ask. A reader expecting the system prompt to
carry the interview script will find it carries phrasing and judgment instead.

## Consequences

Elicitation is ordered by information gain — ask first whatever unblocks the most
Programs — which is what makes progressive disclosure possible and keeps conversations
short for a reason that can be stated plainly: BenefitBridge asks the handful of
questions that matter for *this* household rather than the union of every Program's form.
It also means a new Program automatically starts pulling on the conversation as soon as
its rules land, with no prompt change.
