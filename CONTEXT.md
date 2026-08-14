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
The private-sector and nonprofit discounts that qualifying for one means-tested Program
unlocks — Lifeline, utility rate discounts, Museums for All, YMCA sliding scale. Named
separately from Programs because nobody administers them together and Residents almost
never claim them.
_Avoid_: Perks, extras, secondary benefits

**Eligibility map**:
The results screen listing the Programs and Keychain entries a Resident is likely
eligible for, each with an estimated dollar value and a headline annual total.
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
