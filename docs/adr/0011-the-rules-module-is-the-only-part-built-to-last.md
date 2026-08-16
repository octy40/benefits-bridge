# The rules module is the only part built to last

For the August 19, 2026 demo, the rules module is written as production code with tests —
Program rules, Program units, income derivation, effective-dated figure tables, and the
golden-household fixtures. The conversation UI, eligibility map rendering, language
toggle, and Prefilled application are demo scaffolding, written to be thrown away.

## Context

Five days, one developer, no existing code. Something had to be scaled down, and the
choice was not between "good" and "fast" but between which half of the product absorbs the
compromise.

The rules module is the only part anyone in the room can falsify. Someone at a Connecticut
civic-tech event may well know that CT screens SNAP at 200% FPL under broad-based
categorical eligibility rather than the federal 130% — and a screener that gets that wrong
rejects a large share of Stamford. It is also where `docs/ct-program-facts.md` already
spent the expensive effort of tracing every figure to the agency that owns it. The UI, by
contrast, only has to be right on a projector for five minutes.

## Consequences

The demo will look less polished than one from a team that spent five days on the
interface, and its numbers will survive questions that team's would not. That is the
trade, taken deliberately.

Anyone picking this up afterwards should expect to discard the interface and keep the
rules — which is also why the rules module owns the eligibility map's contents rather than
the components that render it ([[0001-model-elicits-code-decides]],
[[0010-the-model-quotes-figures-but-never-computes-them]]).
