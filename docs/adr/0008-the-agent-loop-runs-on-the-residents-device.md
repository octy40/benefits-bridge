# The agent loop runs on the Resident's device

The browser holds the conversation, executes every tool call, and runs the rules module
locally. The server is a single stateless route whose only job is to hold the Anthropic
API key and forward requests — it has no loop, no session, and no state between requests.

## Considered options

Running the loop server-side is the conventional shape and is leaner on the Resident's
data plan, since one client request can cover several tool calls. It was rejected because
it materialises every Household profile inside our process, which turns
[[0005-nothing-is-stored]] from an architectural fact into a policy promise. The
Municipality is being asked to believe that resident data stays with the government; a
claim that rests on us choosing not to write a log line is worth less than one that rests
on the data never being assembled on our side at all.

## Consequences

The Household profile and the eligibility map exist only on the Resident's device. What
crosses the network is the conversation itself, in transit through the proxy and on to
Anthropic under Anthropic's terms — so the honest claim is **transits unretained**, not
"never leaves the device." Anyone repeating this to a Municipality should say the narrower
thing.

Because the loop is client-driven, the browser re-uploads the whole conversation on every
tool call. This taxes exactly the smartphone-only, prepaid-data Resident the product is
for; in absolute terms it is a few kilobytes of text per turn, which is why the trade was
taken, but it is the one place the architecture charges the wrong person.

The rules module ships to the client, where it can be read and tampered with. This costs
nothing: the rules encode published government figures, and a Resident editing their own
Screening result only misleads themselves — BenefitBridge screens and never determines.

A page refresh loses the conversation, which is [[0005-nothing-is-stored]] working as
intended rather than a bug to fix.
