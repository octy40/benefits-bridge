# BenefitBridge

A conversational AI caseworker offered by a municipality to its residents. One
conversation replaces a dozen separate benefit application intakes: it elicits a
household's circumstances, shows what they are likely eligible for in dollars, and
prepares the paperwork.

## Language

**Resident**:
The person having the conversation — a household member seeking benefits. The *user* of
the product.
_Avoid_: Client, applicant, beneficiary, customer

**Municipality**:
The city or state that offers BenefitBridge to its residents and pays for it. The
*customer* of the product, distinct from the Resident.
_Avoid_: Government, agency, buyer

**Program**:
A single benefit a Resident can receive — SNAP, HUSKY A, Care 4 Kids, CT EITC. Each has
its own eligibility criteria, dollar value, and application.
_Avoid_: Benefit, service

**Waitlisted**:
A Program a Resident is likely eligible for but cannot receive now, because the agency
has a queue — Care 4 Kids is currently about eight months deep. Position in the queue is
set by application date, so a Waitlisted Program is still worth applying for immediately,
and the eligibility map says so rather than hiding the wait.
_Avoid_: Closed, unavailable, pending

**Keychain**:
The private-sector and nonprofit discounts a Resident's circumstances open up — Lifeline,
utility rate discounts, Museums for All. Named separately from Programs because nobody
administers them together and Residents almost never claim them, but the separation is
administrative only: a Keychain entry is screened by the same rules, and most are reachable
either through a means-tested Program or on income alone.
_Avoid_: Perks, extras, secondary benefits

**Eligibility map**:
The results screen listing the Programs and Keychain entries a Resident is likely eligible
for. Entries BenefitBridge can put a defensible figure on carry one and sum into a headline
annual total; the rest are listed beneath it with the reason there is no figure — coverage
rather than cash, or a queue — never with a figure BenefitBridge cannot defend.
_Avoid_: Results, dashboard, report

**Household profile**:
The structured record the conversation produces and Screening runs on: one entry per
household member (age, relationship, income) plus household-level facts (rent, address,
Programs already received). Models people individually rather than as counts, because
Program rules turn on specific members — a child's exact age, a member being 65 or over,
which people are claimable dependents.
_Avoid_: Application data, user data, form data

**Elicitation**:
Drawing the facts Screening needs out of an ordinary conversation, instead of asking a
Resident to fill in a form. Which facts are worth asking for is determined by what the
rules module is missing, not by a fixed script.
_Avoid_: Intake, interview, questionnaire

**Blocking fact**:
A fact absent from the Household profile that stops Screening scoring at least one
Program. Elicitation orders what to ask by how many Programs each one blocks, which is
what makes the conversation short for a statable reason. Distinct from the fact behind
**Indeterminate**, which is deliberately never required.
_Avoid_: Question, field, gap, missing data

**Prefilled application**:
A specific Program's real application fields, rendered in BenefitBridge's own styling and
already populated from the Household profile — not a facsimile of the agency's form, and
not something BenefitBridge submits. What the Resident does with it is take it to the
agency.
_Avoid_: Preview, form, auto-fill

**Document checklist**:
The proofs a Program's application requires, each marked according to whether the
Resident already has it, still needs it, or can produce it with BenefitBridge's help
(e.g. an unfiled tax return). Shown beneath the Prefilled application.
_Avoid_: Requirements, to-do list

**Program unit**:
The set of household members a *particular* Program counts. SNAP counts people who
purchase and prepare food together; HUSKY uses the tax household; Care 4 Kids and the
renters' rebate each have their own. Every Program derives its own unit from the
Household profile — there is no single household size.
_Avoid_: Household (unqualified), family, filing unit

**Screening**:
Estimating that a Resident *likely* qualifies for a Program. BenefitBridge only ever
screens. Deciding that a Resident *does* qualify is a **determination**, which only the
administering agency may make. Resident-facing copy must never state or imply a
determination.
_Avoid_: Qualifying, approving, checking eligibility (when a determination is meant)

**Indeterminate**:
The third Screening outcome, alongside likely-eligible and likely-ineligible: the rules
module cannot score a Program because a fact BenefitBridge deliberately does not require
— immigration status — is absent. Distinct from a fact not yet asked for, which
Elicitation will go and get.
_Avoid_: Unknown, pending, maybe
