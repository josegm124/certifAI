# CertifAI v2 — Frontend Showpiece

An AI-powered AI-governance certification platform. This build is the **frontend
showpiece slice**: a runnable Vite + React + TypeScript app that evolves the
original single-file MVP into a real multi-page product with the interactive
dashboard, the 4A trust ladder, the hover-reactive maturity matrix, and a
hand-built animated radar/spider chart.

The scoring engine, the eight governance domains, the 32 controls, the weighted
scoring, the critical-control gate and the framework mapping are ported **verbatim**
from `CertifAI_MVP.jsx` into shared TypeScript modules and covered by tests that
reproduce the MVP's numbers exactly.

## Stack

- React 18 + TypeScript, built with Vite
- `react-router-dom` for real routes
- `framer-motion` for micro-interactions and the radar draw-in
- `zustand` (with `localStorage` persistence) for the active org/session
- Hand-rolled SVG for the maturity matrix and the radar chart (no chart lib)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm test           # scoring parity + 4A ladder tests (vitest)
```

## Routes

| Route | Page |
|-------|------|
| `/` | Landing — hero, 4A ladder, domain strip, frameworks, how-it-works, pricing |
| `/dashboard` | Smart dashboard — maturity matrix, coverage radar, certification cards, guidance rail |
| `/assess` | Assessment — 32 controls, 0–5 scale, Tier-2 evidence |
| `/results` | Readiness report — score dial, 4A badge, remediation, AI narrative, self-certification |
| `/dimensions/:dimId` | Personalized dimension deep-dive with AI-generated improvement plan |
| `/certifications/:certId` | Certification/framework deep-dive: what each framework requires + your mapped sub-score |

There is no signup gate in this slice — click **"See a live dashboard"** on the
landing page (or **Load sample profile** on the dashboard) to explore with a
seeded org. Real answers you enter in `/assess` persist in `localStorage` and
drive every surface.

## The 4A ladder

Replaces the MVP's three badge tiers (`aware / aligned / assured`) with four
earned levels:

| Level | Name | Band | Requires |
|-------|------|------|----------|
| A1 | Aware | 0–40 | assessment only — internal signal, no badge |
| A2 | Aligned | 41–65 | + evidence |
| A3 | Assured | 66–85 | + evidence + signed self-certification |
| A4 | Advanced | 86–100 | + evidence + signature + no failed critical controls |

The **critical-control gate** (`gatingStatus`) is preserved and extended: any
control flagged `critical` scoring ≤ 1 caps the level at Aware regardless of the
overall score, with an on-screen explanation.

## What's stubbed in this slice

This is the design/frontend layer. The following are represented in the UI but
intentionally not wired to live services (they belong to the backend build):
LinkedIn OAuth, email/password auth, the Postgres/Prisma backend, S3 evidence
storage, and live server-side Claude calls. The "AI-generated" narrative and
improvement plans are produced deterministically from the user's answers as
faithful placeholders for the Claude endpoints described in the build spec.

## Source of truth

`src/lib/data.ts` and `src/lib/scoring.ts` are the single source of truth for the
domain model and scoring. Do not fork these constants — the (future) backend
should import the same math so scores match everywhere. `src/lib/scoring.test.ts`
fuzz-checks 200 answer fixtures against reference implementations copied 1:1 from
the MVP.


## Wiring real AI into Tier 2 (design)

The Tier-2 "AI" surfaces are placeholders today. To make them real, keep every
Claude call **server-side** (`@anthropic-ai/sdk`, key in env only) behind these
endpoints, each returning strict JSON the UI renders deterministically:

1. **`POST /api/evidence/review`** — control + extracted document text + the
   user's written detail → `{ suggestedScore, supports, gaps[], remediation[] }`.
   System prompt is conservative and evidence-bound: never inflate a score
   without support, cite the artifact that drove each conclusion.
2. **`POST /api/narrative`** — domain scores + gaps → a short, audit-appropriate
   readiness narrative (stream it for UX).
3. **`POST /api/guidance`** — a dimension or framework key + the user's answers →
   data-grounded "how to improve" tied to their actual weak controls.
4. **`POST /api/certify/statement`** — generates the self-certification text the
   user reviews before signing.

Engineering rules: validate JSON against a schema with retries, and **cache per
`(controlId, evidenceHash)`** so re-renders don't re-bill. The frontend already
calls the deterministic equivalents in the same shape, so swapping in the real
endpoints is a drop-in replacement.
