# Immigration status is never required

BenefitBridge may ask about immigration status, always optionally and always with a
stated reason, and a Resident who declines still gets an eligibility map. Programs whose
rules turn on status are reported as **Indeterminate** rather than guessed at in either
direction.

## Context

31.1% of Stamford residents are foreign-born, many households are mixed-status, and fear
of being asked is itself a documented barrier to claiming benefits people are legally
entitled to. A screener that requires status turns that fear into an exit; one that
ignores status entirely tells people they qualify for things they do not.

## Consequences

Screening needs a third outcome — `Indeterminate` — which exists solely because of this
decision and would otherwise look like an unnecessary state. For the common case of a
mixed-status family with citizen children, most of the dollar value sits in
status-blind Programs, so declining costs the Resident little.

That last sentence is only true when status is evaluated **per member**, so that a Program
can be scored for citizen children while a parent is Indeterminate. The first
implementation does not do this: it asks one optional household-level question and sends
the status-dependent Programs to Indeterminate wholesale when it goes unanswered. The
coarse version is honest — it never claims eligibility it cannot support — but it
overstates what declining costs, and per-member evaluation is the correction, not an
enhancement.
