# Architecture

CertifAI is a local modular monolith. React/Vite is the presentation layer,
Express coordinates application services, repositories isolate SQLite, and
private evidence files live under `backend/uploads/evidence/`.

```text
React UI
  -> HttpOnly JWT cookie
  -> thin Express routes
  -> assessment / scoring / red-flag / eligibility services
  -> remediation / dossier / issuance services
  -> repositories
  -> SQLite + private attachment storage
```

The composition root is `backend/src/index.js`.

## Authority boundaries

- Account and company authority comes exclusively from the verified JWT.
- The browser captures answers and renders backend results.
- `ScoringService` calculates the real score, band and analytics without caps.
- Backend-only red-flag configuration evaluates nine controls for the stored
  adoption stage.
- `EligibilityService` uses the stored result and persisted flags to determine
  available certificate products.
- Dossier and issuance services never recalculate the source assessment.
- Public verification never reads or exposes dossier evidence.

## Persistence

An account may have one draft assessment. Finalization stores the assessment
result, domain scores and nine flags in one transaction. Flags are immutable.

A remediation assessment copies the source AI system, scores and available
references into a new draft without modifying historical data. Saving a
remediation domain also replaces its confirmation transactionally.

Each finalized eligible assessment has at most one evidence dossier. A dossier
contains exactly nine evidence items and may issue one badge/certificate.

Attachments are authenticated, limited to 10 MB, assigned UUID filenames and
stored with MIME metadata and a SHA-256 digest. Replacement persists the new
metadata before removing the previous file.

## Deliberate MVP limits

- Adoption stage is provisionally fixed to stage 2.
- One company equals one account.
- SQLite and local private file storage are disposable development data.
- Payments, multi-user companies and automated evidence review are outside the
  current release.
