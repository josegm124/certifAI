# CertifAI

Local MVP for a 36-question AI-governance assessment across 9 domains.

## Run

```bash
npm run dev:all
```

Frontend: `http://localhost:5173`

API: `http://localhost:3001/api`

The first visit creates an account at `/register`. One organisation has one
account and one unique email in this MVP. The session is a five-hour signed JWT
stored in an HttpOnly, SameSite=Strict cookie.

## Assessment flow

1. Register or log in.
2. Enter the real AI-system name and select Tier 1 or Tier 2.
3. Complete the 9 domains. Each complete domain is persisted through one
   idempotent request; navigation is blocked if that save fails.
4. Finalize. The backend loads the 36 canonical answers and calculates the
   official score, critical-control gate and level.
5. Tier 2 requires a named self-certification and can issue an Aligned, Assured
   or Advanced public badge. Tier 1 never issues a badge.

Only unsynchronised answers from the current domain remain in localStorage.
After login, the active assessment and its saved answers are recovered from
SQLite with `GET /api/assessments/active`.

## Persistence

`backend/.env` uses `RESET_DB_ON_START=false`, so accounts and assessments
survive restarts. Set it to `true` only when deliberately creating disposable
test data. The pre-feature SQLite data was reset once because this version has
a new authenticated schema.

## Validation

```bash
npm test
npm run build
```

Public badge verification remains available without login:

```text
GET /api/badges/:token/verify
GET /verify/:token
```

Approved Tier 2 results include a **Print certification** action. Runtime logs
are written as dated JSONL files under `backend/logs/`: application activity,
audit events and request/performance metrics are kept in separate files.

The self-certification is an attestation, not a third-party conformity
assessment. Evidence in this MVP is a checkbox plus a text reference; binary
file upload is a future feature.
