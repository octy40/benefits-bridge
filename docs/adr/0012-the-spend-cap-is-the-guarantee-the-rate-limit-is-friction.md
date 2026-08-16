# The spend cap is the guarantee; the rate limit is friction

The proxy route is unauthenticated and always will be. What stops it becoming someone
else's bill is a hard spend cap set on the Anthropic API key before the first deploy. The
IP rate limit in front of the route is friction, not a control: a per-instance in-memory
counter, keyed by a salted hash of the caller's address, swept on a time cadence so no
entry outlives two windows.

## Considered options

A login in front of the route is the obvious control and is ruled out by the product:
"no app, no account" cannot have an account. A Municipality's residents include people
without stable email, without a phone that keeps a number, and with reasons not to
identify themselves to a government website — the absence of a login is the feature.

A shared rate-limit store — Redis, Upstash, anything durable — is the conventional shape
and would hold across instances and cold starts. It was rejected because it is a database
of IP addresses attached to a product whose claim under [[0005-nothing-is-stored]] is that
it has no database. Buying a firmer limit by acquiring the exact asset we tell
Municipalities we do not keep is a bad trade, and the limit was never the guarantee.

## Consequences

The limit is per running instance and resets on a cold start, and because the window is
fixed rather than sliding, a caller who saves their budget for the boundary gets close to
twice the nominal rate in the seconds either side of it. So the real ceiling is looser
than the number in the code, in three separate ways. This is tolerable only because the
spend cap is a real ceiling and this is not. **The cap must be set before the route is
ever publicly reachable**, and a deploy that skips it is the one that costs money.

The counter is state the proxy holds between requests, which reads as a contradiction of
[[0005-nothing-is-stored]] and is not one: what it holds is a hash and an integer, with a
per-process salt that dies with the instance, and nothing of the conversation. A reader
who finds the one `Map` on the server should find this paragraph before assuming the
storage rule slipped. The sweep runs on a time cadence rather than when the table grows
past some size, so that "no entry outlives two windows" is a property of the clock and not
of how much other traffic happened to arrive.

The limit is set loose — a hundred and twenty requests a minute — because Residents share
addresses. A library, a shelter, a community centre sit behind one NAT, and one Resident
message costs two or three upstream requests typically, up to eight in the worst case,
under [[0008-the-agent-loop-runs-on-the-residents-device]]. At a hundred and twenty, five
Residents in one room can each send a message every ten seconds before anyone is turned
away; at sixty — the first number tried — that room would have been throttled while
behaving normally, which is the failure this decision exists to avoid. Locking out the
room is worse than paying for a few thousand tokens, so where the arithmetic is close, the
number goes up.

There is no alerting when the limit fires, because there is no observability at all
(ADR-0005). The only way anyone learns the route is being hammered is the spend cap
tripping, which is another reason the cap is the part that has to be right.
