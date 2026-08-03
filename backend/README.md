# CertifAI Backend

Express 5 and SQLite API for the local MVP. Routes are thin and dependencies
are assembled in `src/index.js`; authentication, persistence, scoring and
finalization live in separate services.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PUT  /api/profile
```

Passwords use Node's `scrypt` with a random salt. JWTs use HS256, expire after
five hours and are sent only in an HttpOnly, SameSite=Strict cookie. Set a long
`JWT_SECRET` in production. Company and email are immutable in this MVP.

## Assessments

```text
POST /api/assessments
GET  /api/assessments
GET  /api/assessments/active
GET  /api/assessments/:id
PUT  /api/assessments/:id/domains/:domainId/answers
POST /api/assessments/:id/finalize
GET  /api/assessments/:id/result
```

All these routes require the cookie and enforce ownership. There can be only
one `draft` assessment per user. The domain PUT validates the exact canonical
question set and upserts all answers in one transaction. Finalization loads all
36 stored answers; the client cannot submit an official score or badge tier.

Critical Q17, Q18 or Q26 at 0 or 1 caps the result at Aware. Tier 1 never emits
a badge. Tier 2 uses the currently agreed MVP evidence rule: at least one stored
evidence reference or attestation. Aware is never a public credential.

## Public routes

```text
GET /api/health
GET /api/badges/:token/verify
GET /verify/:token
GET /verify/:token/badge.svg
```

## Run and test

```bash
npm install
npm test
npm start
```

SQLite reset is explicit: `RESET_DB_ON_START=true` is for disposable testing;
normal development uses `false` so account recovery works across restarts.

## Logs

Each backend start creates dated JSONL files in `backend/logs/` for application
messages, audit events and metrics. Generated `.log` files are intentionally
ignored by Git; `.gitkeep` preserves the directory. Audit records contain IDs
and event names, not passwords or assessment evidence content.
