claude --resume a1b541ee-1c49-4c92-9aa8-5de56bfa3f8e
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CertifAI is an AI Governance Readiness assessment MVP: a self-scored questionnaire (32 controls across 8 governance domains, mapped to frameworks like the EU AI Act, GDPR, OECD, ISO/IEC 42001, NIST AI RMF) that produces a maturity score, gap analysis, and a badge (Aware / Aligned / Assured).

The project was received as a **single self-contained React template file** (`CertifAI_MVP.jsx`) with no backend and no build tooling. A minimal Vite scaffold (`index.html`, `src/main.jsx`, `vite.config.js`, `package.json`) has been added around it so the template can be run in a browser; the original file has not been modified or split up yet.

**This is a front-end-only application.** There is no backend, no API, no database. All state lives in React `useState`/`useMemo` in memory; persistence is handled entirely client-side via JSON export (file download) and import (file upload).

## Commands

```bash
npm install       # install dependencies (first time / after pulling changes)
npm run dev        # start Vite dev server (hot reload)
npm run build       # production build to dist/
npm run preview      # preview the production build locally
```

There are no tests, linter, or type-checker configured yet.

## Architecture

Everything currently lives in **`CertifAI_MVP.jsx`** at the repo root (`src/main.jsx` just mounts it). It is organized top-to-bottom as:

1. **DATA constants**: `MATURITY_LEVELS` (0–5 scale), `DOMAINS` (8 weighted governance domains), `FRAMEWORKS`, `QUESTIONS` (the 32 controls, each tagged with a domain, evidence examples, KPI, applicable frameworks, and an optional `critical` flag), `BADGE_TIERS`.
2. **Scoring functions** (pure, operate on an `answers` map keyed by question id):
   - `domainScores` — per-domain % based on answered questions only.
   - `overallScore` — weighted average across domains (weights re-normalized to only answered domains).
   - `gatingStatus` / `resolveTier` — critical controls scoring ≤1 cap the badge at "Aware" regardless of overall score. This gating rule is the key business logic to preserve when refactoring.
   - `gapAnalysis` — prioritizes remediation items by `(5 - score) * domain weight`, with a 2.2x multiplier for critical controls.
   - `completion` — answered/total tracking, used to gate the free-text "finish" flow and drive the header progress bar.
3. **Theme object `C`**: a single source of truth for the color palette, referenced both by inline styles and interpolated into the CSS-in-JS template string.
4. **Root component `App`**: owns all state (`stage`: intro/assess/results, `tier`: 1=free snapshot / 2=evidence+badge, `org`, `answers`, `idx`) and passes it down as props — no context/store, no routing library (stage transitions are just state, not URL-driven).
5. **View components** per stage: `Intro` (tier picker + org name + JSON import), `Assessment` (one question at a time, domain nav sidebar, evidence/attestation fields only shown for tier 2), `Results` (score dial, badge panel, domain bars, framework coverage rings, prioritized gap list, upsell to tier 2).
6. **Styling**: a single template literal `CSS` injected via `<style>` in `App`, using plain class names (no CSS modules/Tailwind/styled-components). Colors reference the `C` object via string interpolation.

### Key business rules to know before changing scoring/badges
- Scores are 0–5 per control; percentages are only computed over *answered* questions/domains (unanswered ones don't drag the score down, but also don't count toward completion).
- Badge tier is derived from `overallScore`, then **capped to "Aware"** if any critical control (`CRITICAL_IDS`) scored ≤1 — see `resolveTier`'s `cappedFrom` logic, surfaced to the user via a warning banner in `Results`.
- A badge is only considered "earned" (`badgeEarned` in `Results`) when `tier === 2` AND completion is 100%.
- Export/import round-trips `{ org, tier, answers, ts }` as JSON; this is the only persistence mechanism (no localStorage, no backend).
