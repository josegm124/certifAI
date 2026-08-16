# CertifAI

Local MVP for a 36-question AI-governance readiness assessment across nine
domains.

## Quick start

```bash
npm run install:all
npm run dev:all
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api`

See `SETUP.md` for configuration and `TESTING.md` for verification.

## Current workflow

1. Register or log in.
2. Name the AI system in scope and start a readiness assessment.
3. Save all nine domains. Answers are persisted in SQLite.
4. Finalize the assessment. The backend stores the real score, result band,
   domain analytics and exactly nine immutable red-flag evaluations.
5. If no red flag failed, choose any certificate product at or below the
   stored result band.
6. Complete the nine-reference evidence dossier, optionally attach private
   supporting files, sign the declaration and issue the certificate.
7. Public verification exposes the organisation, certificate, score and
   adoption stage, but never evidence references or attachments.

Red flags affect certificate eligibility only; they never cap or alter the
readiness score or result band. The provisional adoption stage is currently 2.

## Certificate catalog

The backend owns product and pricing data:

- Readiness Assessment: free
- Aligned Certificate: EUR 490/year
- Assured Certificate: EUR 1,190/year
- Advanced Certificate: EUR 2,490/year

Payment processing and automated evidence review are not implemented. Any
automated review shown in product copy is marked “In development”.

## Project layout

- `frontend/`: React, TypeScript and Vite
- `backend/`: Express services, repositories and SQLite schema
- `backend/uploads/evidence/`: ignored private attachment storage
- `scripts/dev-all.mjs`: coordinated local development launcher
- `legacy-frontend/`: retained historical frontend, not the active app

No secrets, red-flag thresholds or critical-control identifiers belong in the
frontend bundle.
