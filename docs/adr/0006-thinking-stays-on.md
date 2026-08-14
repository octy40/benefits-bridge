# Thinking stays on

BenefitBridge runs Claude Opus 5 with thinking left enabled (the model's default) and
buys latency back with a low effort setting, rather than disabling thinking outright.

## Context

Disabling thinking is the obvious lever for a chat UI where responsiveness is visible and
latency is the main complaint. On Opus 5 it carries a specific failure mode: with thinking
disabled the model occasionally writes a tool call into its user-facing text instead of
emitting a real tool call. The turn completes successfully, no error is raised, and the
call simply never runs.

## Consequences

BenefitBridge is built entirely on tool calls — the model hands facts to the rules module
that way ([[0001-model-elicits-code-decides]]), so a silently dropped call means the
eligibility map stops updating with nothing to point at. Anyone tuning latency later
should reach for the effort level, never for disabling thinking.
