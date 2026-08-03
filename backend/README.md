# CertifAI Backend API

Express and SQLite backend for the CertifAI AI-governance readiness MVP.

## Run

```bash
npm install
npm start
```

The API runs at `http://localhost:3001/api`. The public verification page is served from `http://localhost:3001/verify/:token`.

## Structure

```text
src/
|-- config/          database and logger
|-- domain/          entities and constants
|-- repositories/    SQLite access
|-- services/        business services
|-- middleware/      request logging and error handling
|-- routes/          API and public verification routes
`-- index.js         composition root
```

The six services are:

- `AssessmentResultService`
- `AssessmentService`
- `BadgeService`
- `CompanyService`
- `SubscriptionService`
- `UserService`

`ScoringService` and `POST /assessments/:id/compute-score` were retired. The frontend owns the single scoring engine used for the live preview. `AssessmentResultService` bounds-checks that score and re-derives completion, evidence and critical-control eligibility from stored answers before resolving a level and issuing a badge. This is not fully server-side scoring.

## Current endpoints

```text
POST /api/companies
GET  /api/companies/:id
GET  /api/users/:id

POST /api/assessments
GET  /api/assessments/:id
GET  /api/users/:userId/assessments
POST /api/assessments/:id/answers
POST /api/assessments/:id/result

POST /api/assessments/:id/badges
GET  /api/badges/:token/verify
GET  /api/companies/:companyId/badges

GET  /api/companies/:companyId/subscription
POST /api/companies/:companyId/upgrade-tier

GET  /api/assessments/:id/export
POST /api/users/:userId/import-assessment

GET  /api/analytics/badges-renewing
GET  /api/health

GET  /verify/:token
GET  /verify/:token/badge.svg
```

See `ENDPOINTS.md` for request and response examples.

## Badge rules

- The canonical result scale is 0-100; individual answers use 0-5.
- The instrument contains 36 questions across 9 domains.
- Aware is an internal readiness signal and is not a credential.
- Stored evidence is required for a badge-bearing level.
- Assured and Advanced require self-certification.
- Q17, Q18 and Q26 at score 0 or 1 cap the result at Aware.
- Free/Tier 1 does not receive a badge in the normal frontend flow.
- Public verification accepts only valid, unexpired Aligned, Assured and Advanced badges with a valid 0-100 score.

## Persistence and auditing

SQLite stores companies, users/leads, AI systems, assessments, answers, badges, subscriptions and audit events. Audit events are created for selected operations such as lead registration, assessment creation, badge issuance, tier upgrade and import. Answer writes and result metric updates are not currently audit-logged, so the project must not claim that every mutation is audited.

## Known MVP limitations

- No authentication, login, JWT or role-based access control.
- No AI/model integration.
- The official score originates in the frontend and is not recomputed by the backend.
- Badge frameworks are caller-supplied.
- Subscription persistence and checkout are incomplete; checkout remains intentionally inactive.
- SQLite is intended for the local MVP.

## Validation

From the repository root:

```bash
npm test
npm run build
```

For a backend happy-path check, start the server and run:

```powershell
.\TEST_HAPPY_PATH.ps1
```
