# Nothing is stored

BenefitBridge has no database and no server-side logging of conversations — not
transcripts, not extracted Household profiles, not structural telemetry about which
Programs fired. A conversation exists in the browser for as long as the Resident has the
page open, and then it is gone.

## Context

The product's promise to its Municipality customer is that resident data stays with the
government and is never monetized or shared, and [[0004-immigration-status-is-never-required]]
tells Residents they may decline to share sensitive facts. Both claims are undermined if
BenefitBridge quietly retains the conversation on its own infrastructure.

## Consequences

There is no observability. When a conversation goes wrong there is no record to inspect
afterward — debugging happens live or not at all, and the golden-household fixtures on
the rules module are the only regression signal. A future reader looking for the logging
that any comparable app would have will not find it, and adding it is a decision to be
made deliberately rather than a gap to be filled.

A Resident who closes the tab loses the Prefilled application along with everything else,
so the only way to leave with the paperwork is to print or save it as a PDF from the
browser — entirely on the device, no account, nothing transmitted. This limitation is
worth stating to a Municipality rather than hiding: not keeping the data is what costs
the Resident their copy.

There is also no way to reload or replay a session, which means a conversation that goes
wrong in front of an audience cannot be recovered. The fallback is a **golden-household
fixture** loaded behind a URL parameter, skipping Elicitation and rendering the
eligibility map directly. This is not a violation of the decision: what it holds is an
invented household written by us as a test input, never a Resident's Household profile.
The rule this ADR states is that *Resident* data is not retained — fixtures are code.
