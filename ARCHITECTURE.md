# Architecture

CertifAI is a local modular monolith: React/Vite is the presentation layer,
Express contains application services, and repositories isolate SQLite.

```text
React UI
  -> HttpOnly JWT cookie
  -> thin Express routes
  -> Auth / Assessment / DomainAnswer / Finalization / Scoring services
  -> repositories
  -> SQLite
```

The composition root is `backend/src/index.js`. Services receive repositories
through constructors; routes do not contain scoring or persistence rules.

## Authority boundaries

- The browser captures answers and displays backend data.
- The account identity comes only from a verified five-hour JWT cookie.
- The backend verifies assessment ownership and immutable tier.
- `instrument.js` defines the 9 domains, 36 question IDs and critical controls.
- `ScoringService` calculates the official domain and overall scores.
- `AssessmentFinalizationService` is the only badge-issuance path.

## Persistence sequence

The assessment has `draft` and `finalized` states. A partial unique SQLite
index permits only one draft per user. Each completed domain is PUT as one
transactional, idempotent batch. The browser removes that domain from its
local pending cache only after a successful response.

Finalization requires all 36 canonical rows. Tier 2 additionally requires a
named signatory and accepted declaration. Badge issuance is idempotent through
a unique `assessment_id`; retrying finalization can repair a badge write that
failed after the assessment was closed.

## Operational records

The backend writes dated newline-delimited JSON files to `backend/logs/`:

- `application-YYYY-MM-DD.log` for server activity and errors;
- `audit-YYYY-MM-DD.log` for account, assessment, domain and badge events;
- `metrics-YYYY-MM-DD.log` for HTTP duration/status and important workflow timings.

Passwords, answer content and evidence text are not written to these logs.

## MVP choices

One company equals one account/email. Evidence is currently a text reference
or attestation, not a binary upload. SQLite and a single Node process are
appropriate for the local final-course MVP; repositories keep a later database
replacement contained.
