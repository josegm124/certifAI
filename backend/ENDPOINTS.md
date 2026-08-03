# CertifAI API Endpoints

Base URL: `http://localhost:3001/api`

There is no authentication in the MVP. IDs are not authorization credentials.

## Companies and leads

### Register or reuse a company and lead

```http
POST /companies
Content-Type: application/json

{
  "name": "Test Corp AI",
  "email": "test@example.com",
  "role": "Compliance / Risk"
}
```

Response: `{ userId, companyId, name, email, role, tier, createdAt }`

### Fetch records

```text
GET /companies/:id
GET /users/:id
```

## Assessments

### Create assessment

```http
POST /assessments
Content-Type: application/json

{
  "userId": "<userId>",
  "aiSystemId": "system-1",
  "tier": "free"
}
```

Valid tiers in storage are `free`, `starter`, `professional` and `enterprise`. The frontend maps its Tier 1 choice to `free` and Tier 2 to `professional`.

### Read assessments

```text
GET /assessments/:id
GET /users/:userId/assessments
```

### Record an answer

```http
POST /assessments/:assessmentId/answers
Content-Type: application/json

{
  "questionId": "1",
  "score": 3,
  "evidence": "Documented policy",
  "attestation": "confirmed"
}
```

Scores use the 0-5 answer scale.

## Result and badge issuance

### Submit result

```http
POST /assessments/:assessmentId/result
Content-Type: application/json

{
  "overallScore": 72,
  "domainScores": [
    { "id": "strategy", "pct": 70 },
    { "id": "revenue", "pct": 65 },
    { "id": "governance", "pct": 75 },
    { "id": "risk", "pct": 68 },
    { "id": "data", "pct": 74 },
    { "id": "human", "pct": 70 },
    { "id": "trust", "pct": 76 },
    { "id": "workforce", "pct": 73 },
    { "id": "improve", "pct": 77 }
  ],
  "levelContext": {
    "tier": 2,
    "hasEvidence": true,
    "hasSignature": true
  },
  "criticalGating": { "capped": false, "failedIds": [] },
  "gaps": [],
  "selfCertifiedAt": "2026-08-03T12:00:00.000Z",
  "frameworks": ["aiact", "gdpr", "oecd", "iso", "nist"]
}
```

The backend validates the payload, derives completion, evidence and critical-control gating from stored answers, resolves the level, stores the result and issues an eligible badge at 100% completion.

Response includes:

```json
{
  "overallScore": 72,
  "level": "A3",
  "levelName": "Assured",
  "badgeTier": "assured",
  "badgeEligible": true,
  "criticalGating": { "capped": false, "failedIds": [] },
  "completion": { "answered": 36, "total": 36, "percentage": 100 },
  "badge": {
    "id": "<badgeId>",
    "tier": "assured",
    "score": 72,
    "verificationToken": "<token>",
    "verifyUrl": "http://localhost:3001/verify/<token>"
  }
}
```

Known limitation: `overallScore` and `domainScores` are calculated by the frontend and bounds-checked, not recomputed, by the backend. Eligibility gates are re-derived server-side.

The retired `POST /assessments/:assessmentId/compute-score` endpoint does not exist.

### Direct badge route

```http
POST /assessments/:assessmentId/badges
Content-Type: application/json

{
  "frameworks": ["aiact", "gdpr", "oecd", "iso", "nist"]
}
```

This hardened compatibility route ignores caller-supplied tier and score. It requires a stored, complete, badge-bearing result and derives the company from the assessment owner. The normal frontend flow uses `/result`, which already issues the badge.

### Verify and list badges

```text
GET /badges/:token/verify
GET /companies/:companyId/badges
GET /verify/:token                 (outside the /api prefix; HTML)
GET /verify/:token/badge.svg       (outside the /api prefix; image)
```

## Subscriptions

```text
GET  /companies/:companyId/subscription
POST /companies/:companyId/upgrade-tier
```

The upgrade UI does not call the upgrade endpoint because subscription persistence is incomplete in the MVP.

## Export and import

```text
GET  /assessments/:assessmentId/export
POST /users/:userId/import-assessment
```

## Analytics and health

```text
GET /analytics/badges-renewing?days=60
GET /health
```
