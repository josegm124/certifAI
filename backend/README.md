# CertifAI Backend API

Backend Express.js + SQLite para CertifAI - AI Governance Readiness Assessment MVP.

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Run the server
npm start

# Server runs on http://localhost:3001
```

## Architecture

**Clean Architecture (3 Layers) + Dependency Injection + SOLID**

```
src/
├── config/              Database & Logger setup
├── domain/              Entities & constants
├── repositories/        Data access layer (SQLite)
├── services/            Business logic layer
├── controllers/         HTTP handlers
├── middleware/          Logging, error handling
├── routes/              API endpoints
└── index.js             Express app entry point
```

### Key Design Patterns

- **Repository Pattern**: Abstraction over data access (SQLite)
- **Service Layer**: All business logic (scoring, badges, subscriptions)
- **Factory Pattern**: Badge creation with metadata
- **Dependency Injection**: Services receive dependencies, not instantiate them
- **SOLID Principles**:
  - Single Responsibility: Each service owns one domain (Scoring, Badge, etc.)
  - Open/Closed: Easy to extend frameworks without modifying scoring logic
  - Liskov Substitution: Repositories implement consistent interface
  - Interface Segregation: Services are small, focused
  - Dependency Inversion: Services depend on abstractions (repositories)

### Logging

- **Structured logging** via Pino (JSON format in production)
- **Pretty console output** in development
- **Audit trail** via AuditLog table (all mutations tracked)

## Core Services

### ScoringService
- `computeDomainScores()` - Calculate per-domain scores
- `computeOverallScore()` - Weighted average across domains
- `resolveBadgeTier()` - Tier (aware/aligned/assured) + gating logic
- `checkCriticalGating()` - Block top tiers if any critical ≤1
- `computeGapAnalysis()` - Prioritized remediation items
- `computeCompletion()` - % answered tracking

### BadgeService
- `issueBadge()` - Create badge with 12-month expiry
- `getActiveBadge()` - Fetch non-expired badge
- `verifyBadge()` - Verify by token (public endpoint)
- `renewBadge()` - Extend 12 months
- `findRenewingSoon()` - Find badges expiring within N days
- `getBadgeMetadata()` - Tier → label/icon/color

### AssessmentService
- `createAssessment()` - Start new assessment
- `recordAnswer()` - Save/update answer (0-5 + evidence/attestation)
- `updateAssessmentMetrics()` - Store computed scores
- `exportAssessment()` - JSON export
- `importAssessment()` - JSON import

### SubscriptionService
- `createSubscription()` - Tier registration
- `upgradeTier()` - Tier change
- `renewSubscription()` - Extend expiry
- `getTierFeatures()` - Tier → capabilities map

### OrganizationService
- `createOrganization()` - Onboard new org
- `getOrganization()` - Fetch org data
- `updateOrganization()` - Modify org

## API Endpoints

### Organizations
- `POST /api/organizations` - Create org
- `GET /api/organizations/:id` - Get org

### Assessments
- `POST /api/assessments` - Start assessment
- `GET /api/assessments/:id` - Get assessment
- `GET /api/organizations/:orgId/assessments` - List org assessments
- `POST /api/assessments/:id/answers` - Record answer
- `POST /api/assessments/:id/compute-score` - Compute all scores & gaps

### Badges
- `POST /api/assessments/:id/badges` - Issue badge
- `GET /api/badges/:token/verify` - Public badge verification
- `GET /api/organizations/:orgId/badges` - List active org badges

### Subscriptions
- `GET /api/organizations/:orgId/subscription` - Get subscription + features
- `POST /api/organizations/:orgId/upgrade-tier` - Upgrade tier

### Export/Import
- `GET /api/assessments/:id/export` - Download as JSON
- `POST /api/organizations/:orgId/import-assessment` - Upload JSON

### Analytics
- `GET /api/analytics/badges-renewing?days=60` - Badges expiring soon
- `GET /api/health` - Server health check

## Database Schema

**Core tables:**
- `organizations` - Customer accounts
- `ai_systems` - AI systems per org
- `assessments` - Assessment instances
- `assessment_answers` - Q&A data (0-5 scores + evidence)
- `domain_scores` - Cached per-domain calculations
- `badges` - Issued badges with verification tokens
- `subscriptions` - Tier tracking + expiry
- `audit_logs` - All mutations logged

**Indexes on:** assessment lookups, badge expiry, subscription expiry for batch renewal jobs.

## Integration with Frontend

1. **Frontend creates org:**
   ```
   POST /api/organizations { name, email }
   → organizationId
   ```

2. **Frontend starts assessment:**
   ```
   POST /api/assessments { organizationId, aiSystemId, tier }
   → assessmentId
   ```

3. **Frontend records answers as user progresses:**
   ```
   POST /api/assessments/:id/answers { questionId, score, evidence?, attestation? }
   ```

4. **Frontend requests scoring when complete:**
   ```
   POST /api/assessments/:id/compute-score { questionMapping }
   → { domainScores, overallScore, badgeTier, completion, gaps }
   ```

5. **Backend issues badge automatically (if tier 2 & 100% complete):**
   ```
   POST /api/assessments/:id/badges { organizationId, tier, overallScore, frameworks }
   → badge with verificationToken
   ```

6. **Public badge share link:**
   ```
   GET /api/badges/:verificationToken/verify
   → badge metadata (no auth required)
   ```

## Environment Variables

```
PORT=3001                    # API port
LOG_LEVEL=info              # Logging level (debug, info, warn, error)
NODE_ENV=development        # Environment
```

## Notes

- **No authentication yet** - Next iteration: JWT or session management
- **No email service yet** - Badge renewal notifications ready, needs SMTP
- **Frameworks hardcoded** - Map custom frameworks by extending DOMAINS constant
- **SQLite for MVP** - Easy deployment, no server needed. Scale to PostgreSQL later.
- **CORS configured** for frontend at localhost:5173

## Next Steps (Post-MVP)

1. Add auth (JWT + user roles)
2. Email service (renewal reminders, badge notifications)
3. PDF dossier generation (LLM-assisted mapping)
4. Analytics dashboard (completion funnels, NPS, LTV/CAC)
5. White-label API (Enterprise tier)
