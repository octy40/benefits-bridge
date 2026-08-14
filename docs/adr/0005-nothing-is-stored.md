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
