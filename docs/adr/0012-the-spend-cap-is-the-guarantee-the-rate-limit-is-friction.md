# The spend cap is the guarantee; the rate limit is friction

The proxy route is unauthenticated and always will be. What stops it becoming someone
else's bill is a hard spend cap set on the Anthropic API key before the first deploy. The
IP rate limit in front of the route is friction, not a control: a per-instance in-memory
counter, keyed by a salted hash of the caller's address, forgotten a minute later.

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

The limit is per running instance and resets on a cold start, so the real ceiling is
looser than the number in the code — an attacker spread across addresses, or lucky with
scaling, gets more than sixty requests a minute. This is tolerable only because the spend
cap is a real ceiling and this is not. **The cap must be set before the route is ever
publicly reachable**, and a deploy that skips it is the one that costs money.

The counter is state the proxy holds between requests, which reads as a contradiction of
[[0005-nothing-is-stored]] and is not one: what it holds is a hash and an integer, with a
per-process salt that dies with the instance, and nothing of the conversation. A reader
who finds the one `Map` on the server should find this paragraph before assuming the
storage rule slipped.

The limit is set loose — sixty requests a minute — because Residents share addresses. A
library, a shelter, a community centre sit behind one NAT, and one Resident message can
cost up to eight upstream requests under [[0008-the-agent-loop-runs-on-the-residents-device]].
A limit tight enough to matter against a script would lock out the room, and locking out
the room is a worse failure than paying for a few thousand tokens.

There is no alerting when the limit fires, because there is no observability at all
(ADR-0005). The only way anyone learns the route is being hammered is the spend cap
tripping, which is another reason the cap is the part that has to be right.
