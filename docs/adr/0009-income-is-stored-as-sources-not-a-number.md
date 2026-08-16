# Income is stored as sources, not a number

There is no `income` field on the Household profile, for the same reason there is no
`householdSize` ([[0003-each-program-derives-its-own-unit]]). Each member holds a list of
income sources — amount, period, and type — and every Program derives its own countable
income from that list.

## Considered options

Storing one annual or monthly figure and converting per Program was rejected. The Programs
disagree about what income *is*, not merely about the period it is expressed in. SNAP
splits earned from unearned to apply a 20% earned-income deduction. EITC counts earned
income and AGI and ignores Social Security entirely. The elderly renters' rebate counts
"all taxable and nontaxable income," explicitly including net Social Security from
SSA-1099 Box 5.

A grandmother's Social Security is therefore invisible to one Program, fully countable in
another, and unearned income in a third. No single number carries that, and a conversion
layer over one number would have to reconstruct the type information it threw away.

## Consequences

Elicitation asks where money comes from rather than how much it is — which is how a
caseworker asks anyway, and how cash wages get captured at all. Maria is paid partly in
cash: that is countable earned income for SNAP and self-employment income for EITC, and a
single "annual income" question would have quietly lost it along with the EITC upside that
is the pitch's central insight.
