# The map flips without asking the model

Tapping the language toggle re-renders the eligibility map and every word of interface
chrome from a translation table keyed by Program id, synchronously, with no request sent.
The only thing that goes to the model is a re-narration of the last thing BenefitBridge
said, appended to the conversation as a new turn. Everything said before it stays exactly
as it was said.

## Context

42.6% of Stamford speaks a language other than English at home, roughly double the
Connecticut rate. Spanish is not a locale this product added; it is the condition of the
product working at all for a large share of the people it is for. Which means the toggle
is on the critical path of the demo and of the thing itself, and "it flips, then a spinner,
then the numbers come back" is a different product from "it flips".

## Considered options

Asking the model to translate the eligibility map was never available, and that is worth
stating rather than assuming. Under [[0001-model-elicits-code-decides]] the map's contents
are the rules module's, and under
[[0010-the-model-quotes-figures-but-never-computes-them]] the model transcribes figures
rather than producing them. A translation pass over the map is a model round trip whose
output is the map — which is exactly the arrangement both decisions exist to prevent. The
toggle being instant is therefore a consequence of a structural choice made for
credibility, not a performance optimisation, and it is the cheapest available proof that
the split is real: nothing on that panel can be re-translated, because nothing on it was
ever written by the model.

Re-narrating the whole transcript was considered and rejected. It would put words in the
Resident's mouth — their own turns are theirs, and a transcript that changes when you
change the language is one nobody can honestly scroll back through. Re-narrating nothing
was also rejected: the map beside the conversation has already flipped, so the last thing
on screen would sit in the language the Resident just left, which reads as the toggle
half-working.

Re-narrating by editing the last assistant message in place was rejected for the same
reason, plus a mechanical one: it invalidates the prompt cache from that point, where
appending does not — the same argument that keeps superseded eligibility maps marked in
place rather than pruned ([[0006-thinking-stays-on]]).

The language rides in the system prompt rather than only in that appended turn, so
"continue in Spanish" is restated on every request instead of decaying across a long
conversation. This costs a full prompt-cache invalidation on the tap, paid once, on a
deliberate act.

## Consequences

Adding a Program now means adding a row to `src/ui/copy.ts` in every language as well as
writing its rules, and `eligibility-map-view.test.ts` fails if the row is missed rather
than letting a raw Program id reach a Resident's screen. Adding a *language* means adding a
row to `src/language.ts` and a column to `src/ui/copy.ts`; nothing else in the product knows
how many there are, and nothing else names them.

Dollar figures are outside the table entirely. Amounts are formatted once by `money.ts`
and interpolated into sentences the table supplies, so the entries that carry an amount
are functions rather than strings with a number embedded in them — a translator cannot
reach a figure, because no figure is ever inside a translated string. The test asserts
this directly: every amount rendered in Spanish is byte-identical to the one rendered in
English.

The conversation carries a visible seam. The transcript reads in English up to the tap and
in Spanish after it, with one message said twice, and the appended instruction is a turn in
the history that the Resident never sent. That is the honest artifact of not rewriting the
past, and it is preferred to the alternative.

The interface is still demo scaffolding under
[[0011-the-rules-module-is-the-only-part-built-to-last]] — but the translation table and
the map's view model are the parts of it that would survive, because they are where the
"no model in the loop" claim is actually enforced.
