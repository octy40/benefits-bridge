# BenefitBridge

A conversational AI caseworker offered by a municipality to its residents. See
`CONTEXT.md` for the domain language and `docs/adr/` for the decisions.

## Running it

```sh
npm install
cp .env.example .env.local   # then put a real key in it
npm run dev
```

`ANTHROPIC_API_KEY` is read server-side only, by `src/app/api/anthropic/route.ts`.
It must never be prefixed `NEXT_PUBLIC_` — the repo is public and the key would
ship in the client bundle.

```sh
npm test        # the rules module, through screen()
npm run typecheck
npm run build
```

## Where things are

| Path | What it is |
| --- | --- |
| `src/rules/` | The rules module. Production code with tests — the only part built to last (ADR-0011). `screen()` is the single seam. |
| `src/conversation/` | The agent loop, the facts tool, and the eligibility-map tool result. Runs in the browser (ADR-0008). |
| `src/app/api/anthropic/` | The whole server: one stateless route holding the API key (ADR-0008), which writes nothing down (ADR-0005). |
| `src/ui/` | Conversation and eligibility map. Renders from `ScreeningResult`, never from model text (ADR-0001). |

Everything outside `src/rules/` is demo scaffolding, written to be discarded.
