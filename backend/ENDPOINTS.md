# CertifAI API Endpoints

## Base URL
```
http://localhost:3001/api
```

---

## Organizations

### Create Organization
```
POST /organizations
Content-Type: application/json

{
  "name": "Test Corp AI",
  "email": "test@certifai.local"
}

Response:
{
  "id": "org-123...",
  "name": "Test Corp AI",
  "email": "test@certifai.local",
  "tier": "free",
  "createdAt": "2026-07-08T19:30:00Z"
}
```

### Get Organization
```
GET /organizations/:id

Response: { id, name, email, tier, subscriptionId, subscriptionExpiresAt, ... }
```

---

## Assessments

### Create Assessment
```
POST /assessments
Content-Type: application/json

{
  "organizationId": "org-123...",
  "aiSystemId": "system-1234567890",
  "tier": "free" | "professional"
}

Response:
{
  "id": "assess-456...",
  "organizationId": "org-123...",
  "aiSystemId": "system-1234567890",
  "tier": "free",
  "completionPercentage": 0,
  "overallScore": 0,
  "badgeTier": "aware",
  "createdAt": "2026-07-08T19:30:00Z"
}
```

### Get Assessment
```
GET /assessments/:id

Response: { id, organizationId, aiSystemId, tier, completionPercentage, overallScore, badgeTier, ... }
```

### List Assessments by Org
```
GET /organizations/:orgId/assessments

Response: [ { assessment_1 }, { assessment_2 }, ... ]
```

---

## Answers

### Record Answer
```
POST /assessments/:assessmentId/answers
Content-Type: application/json

{
  "questionId": "1",
  "score": 3,
  "evidence": "We have documented AI policies",
  "attestation": "Verified in Q4 audit"
}

Response:
{
  "id": "answer-789...",
  "assessmentId": "assess-456...",
  "questionId": "1",
  "score": 3,
  "evidence": "...",
  "attestation": "...",
  "createdAt": "2026-07-08T19:30:00Z"
}
```

---

## Scoring

### Compute Scores
```
POST /assessments/:assessmentId/compute-score
Content-Type: application/json

{
  "questionMapping": {
    "1": { "domain": "strategy", "description": "AI Strategy" },
    "2": { "domain": "strategy", "description": "Leadership Commitment" },
    ...
  }
}

Response:
{
  "domainScores": {
    "strategy": { "average": 3.5, "percentage": 70, "answeredCount": 5 },
    "governance": { "average": 3.0, "percentage": 60, "answeredCount": 4 },
    ...
  },
  "overallScore": 3.2,
  "badgeTier": "aligned",
  "criticalGating": false,
  "completion": {
    "answered": 32,
    "total": 32,
    "percentage": 100
  },
  "gaps": [
    {
      "questionId": "5",
      "question": "AI Business Objectives",
      "domain": "Strategy & Leadership",
      "currentScore": 2,
      "gapSize": 3,
      "priority": 0.65,
      "isCritical": false
    },
    ...
  ]
}
```

---

## Badges

### Issue Badge
```
POST /assessments/:assessmentId/badges
Content-Type: application/json

{
  "organizationId": "org-123...",
  "tier": "aligned",
  "overallScore": 3.2,
  "frameworks": ["aiact", "gdpr", "oecd", "iso", "nist"]
}

Response:
{
  "id": "badge-abc...",
  "assessmentId": "assess-456...",
  "organizationId": "org-123...",
  "tier": "aligned",
  "score": 3.2,
  "issuedAt": "2026-07-08T19:30:00Z",
  "expiresAt": "2027-07-08T19:30:00Z",
  "verificationToken": "abc123def456ghi789",
  "frameworksIncluded": ["aiact", "gdpr", "oecd", "iso", "nist"]
}
```

### Verify Badge (Public)
```
GET /badges/:verificationToken/verify

Response: { id, tier, score, issuedAt, expiresAt, verificationToken, ... }
(NO authentication required - public endpoint)
```

### List Org Badges
```
GET /organizations/:orgId/badges

Response: [ { badge_1 }, { badge_2 }, ... ]
```

---

## Subscriptions

### Get Subscription
```
GET /organizations/:orgId/subscription

Response:
{
  "subscription": {
    "id": "sub-123...",
    "organizationId": "org-123...",
    "tier": "professional",
    "priceEur": 1490,
    "expiresAt": "2027-07-08T19:30:00Z",
    "status": "active"
  },
  "features": {
    "assessments": null,
    "frameworks": 7,
    "systems": 3,
    "annualReasessment": true,
    "badge": true
  }
}
```

### Upgrade Tier
```
POST /organizations/:orgId/upgrade-tier
Content-Type: application/json

{
  "newTier": "professional"
}

Response: { subscription object }
```

---

## Analytics

### Badges Renewing Soon
```
GET /analytics/badges-renewing?days=60

Response:
{
  "count": 5,
  "daysThreshold": 60,
  "badges": [ { badge_1 }, { badge_2 }, ... ]
}
```

---

## Health

### Server Health
```
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-07-08T19:30:00Z"
}
```

---

## Summary: Happy Path

```
1. POST /organizations
   → Get organizationId

2. POST /assessments
   → Get assessmentId (tier=free)

3. POST /assessments/:id/answers (loop x 32)
   → Save each answer

4. POST /assessments/:id/compute-score
   → Get scores, gaps, completion

5. [UPGRADE] POST /assessments (new, tier=professional)
   → Get new assessmentId

6. POST /assessments/:id/answers (loop x 32)
   → Copy answers to new assessment

7. POST /assessments/:id/compute-score
   → Recompute scores (now professional)

8. POST /assessments/:id/badges
   → Issue badge (if tier=professional + 100% complete)

9. GET /badges/:token/verify
   → Public verification (share with anyone)
```
