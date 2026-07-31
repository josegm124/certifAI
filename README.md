# CertifAI

AI governance maturity assessment. A 36-question self-assessment across 9 governance
domains, mapped to 7 regulatory frameworks and scored on a 0–5 maturity scale.

## Layout

```
frontend/         React 18 + TypeScript + Vite   → http://localhost:5173
backend/          Express 5 + SQLite             → http://localhost:3001
legacy-frontend/  the earlier single-file JSX build, kept for reference
ARCHITECTURE.md   backend architecture notes (Clean Architecture / SOLID / DI)
```

## Start it (two terminals)

```bash
npm --prefix backend run dev
```

```bash
npm --prefix frontend run dev
```

First time only:

```bash
npm run install:all
```

The backend creates and seeds its SQLite database on start. `backend/.env` sets
`RESET_DB_ON_START=true` by default, so **data is wiped on every restart** — set it
to `false` to keep records between runs.

## Tests

```bash
npm --prefix frontend run test
```

Covers the scoring engine and the 4A ladder.

## How scoring and badges are split

There is one scoring engine, in `frontend/src/lib/scoring.ts`, reading the canonical
instrument from `frontend/src/lib/data.ts`. It produces the score you see on screen
immediately, as a **preview**.

The **badge is issued by the backend, not the browser.** When a tier-2 user signs the
self-certification, the frontend posts its score plus the level context to
`POST /api/assessments/:id/result`. The server then, from its own stored answers:

- re-derives the critical-control gate (Q17, Q18, Q26 at or below 1 → capped to Aware)
- re-derives whether any evidence actually exists
- resolves the level itself, applying the tier, evidence and signature requirements
- issues the badge only if the level it resolved is badge-bearing and the assessment is complete

A client asserting `hasSignature` or `hasEvidence` over an empty answer table gets no
badge. If the backend is unreachable the app still works, shows the local preview, and
issues **no** badge — it says so rather than implying a credential exists.

Badges carry a 12-month expiry and a verification token. Anyone can check one without
logging in:

```bash
curl http://localhost:3001/api/badges/<token>/verify
```

`http://localhost:3001/verify/<token>` serves the public HTML page with OpenGraph tags
for link previews.

## Known limitations, stated plainly

- The submitted score is not tamper-proof. The gates above mean an inflated score alone
  cannot mint a badge, but moving the scoring module server-side is the production fix.
  It is written with no DOM or React dependency so it can be lifted across unchanged.
- The self-certification is an attestation, not a verified signature.
- `POST /api/assessments/:id/compute-score` still exists alongside `/result` and runs a
  second, older scoring engine on a 0–5 scale. `/result` is the one that issues badges.
- The AI narrative and improvement plans are produced deterministically from the user's
  own answers, as stand-ins for live model calls.
- Pricing presents four tiers as the commercial model; the build implements the free and
  professional flows.
