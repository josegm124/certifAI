# CertifAI - Testing Guide

## Automated checks

From the repository root:

```bash
npm test
npm run build
```

`npm test` currently runs the frontend scoring unit tests. `npm run build` runs the TypeScript check and Vite production build. These commands do not constitute backend integration coverage.

## Start the application

```bash
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Health: `http://localhost:3001/api/health`

## Manual happy path

1. Clear the browser storage for `localhost:5173`.
2. Open `/start` and enter organisation, work email and role.
3. Select Tier 2.
4. Answer all 36 questions.
5. Add evidence to at least one answer.
6. Open Results, enter the signatory name and submit the self-certification.
7. Confirm that the returned badge contains a token, 0-100 score and expiry date.
8. Open `http://localhost:3001/verify/<token>`.

## Required behaviour

### Intake and completion

- `/assess` and `/results` redirect to `/start` when intake is incomplete.
- The self-certification control stays disabled below 36 of 36 answers.
- No level of record or badge is stored below 100% completion.

### Critical controls

- Q17, Q18 and Q26 are critical.
- A score of 0 or 1 on any of them limits the result to Aware.
- Aware does not produce a credential.

### Tier and evidence

- Tier 1/free produces an internal Aware signal and no badge.
- A badge-bearing level requires stored evidence under the current implementation.
- Assured and Advanced also require self-certification.

### Public verification

- A valid, unexpired Aligned/Assured/Advanced token returns JSON at `/api/badges/:token/verify` and HTML at `/verify/:token`.
- The public score is displayed as the stored 0-100 value; no legacy 0-5 conversion is applied.
- Aware, unknown tiers and invalid scores do not render as verified credentials.
- Public copy says `publicly verifiable`, not `independently verifiable`.

## Backend happy-path script

Start the backend, then run:

```powershell
cd backend
.\TEST_HAPPY_PATH.ps1
```

The script registers a company/lead, creates free and professional assessments, records 36 answers, submits each result through `/result`, and verifies the issued badge.

## API quick reference

```text
POST /api/companies                            Register company and lead
POST /api/assessments                          Create assessment
POST /api/assessments/:id/answers              Record answer
POST /api/assessments/:id/result               Record result and issue eligible badge
POST /api/assessments/:id/badges               Hardened compatibility issue route
GET  /api/badges/:token/verify                 Verify badge as JSON
GET  /verify/:token                            Public HTML verification page
```

The old `POST /api/assessments/:id/compute-score` endpoint has been removed.

## Known limitations to state during testing

- No authentication or JWT.
- No AI/model calls.
- Checkout is intentionally inactive.
- Scoring is not fully server-side: the server bounds-checks the frontend score and re-derives eligibility gates.
- Audit events exist for selected operations, not every mutation.
