# Each Program derives its own unit from the Household profile

There is no `householdSize` field anywhere in BenefitBridge. The Household profile stores
people; each Program computes its own **Program unit** from that list, because the
programs genuinely disagree about who counts — SNAP counts people who purchase and
prepare food together, HUSKY uses the tax household, and a grandparent who moved in can
be inside one and outside the other.

## Consequences

A reader expecting one household size will find none, and adding one "for convenience"
would quietly reintroduce the wrong answer for whichever Program disagrees with it. The
cost is one extra fact per member (does this person share food purchase and
preparation?); the return is that BenefitBridge can say something true that no screener
in the competitive landscape says — that a person can count for one Program and not
another — instead of silently picking one definition and being wrong elsewhere.
