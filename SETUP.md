# CertifAI MVP – Setup & Launch

Complete full-stack setup for frontend (React/Vite) + backend (Express/SQLite).

## Prerequisites
- Node.js 18+ installed
- npm installed

## Quick Start (2 terminals)

### Terminal 1: Frontend
```bash
cd C:\Users\jose.guerrero_isol\Desktop\certifAI_MVP
npm install
npm run dev
```
→ Opens on **http://localhost:5173**

### Terminal 2: Backend
```bash
cd C:\Users\jose.guerrero_isol\Desktop\certifAI_MVP\backend
npm install
npm start
```
→ Runs on **http://localhost:3001**

---

## What's Working (MVP Scope)

### Frontend (React)
✅ Assessment questionnaire (32 controls, 8 domains)
✅ Domain navigation sidebar
✅ Scoring display (domain %, overall %)
✅ Badge tiers (Aware/Aligned/Assured) with gating logic
✅ Gap analysis (prioritized remediation)
✅ Framework coverage visualization
✅ Tier 1 (free) & Tier 2 (evidence+badge) flows
✅ JSON export/import for persistence

### Backend (Express + SQLite)
✅ Organization management (create, fetch)
✅ Assessment CRUD + answer recording
✅ Scoring engine (domain scores, overall, gating, gaps)
✅ Badge issuance with 12-month expiry + verification token
✅ Subscription tier tracking
✅ Public badge verification endpoint (no auth required)
✅ Export/import for data portability
✅ Audit logging of all mutations
✅ Structured logging (Pino)
✅ Health check endpoint
✅ CORS configured for frontend

---

## API Flow (For Testing)

### 1. Create Organization
```
POST http://localhost:3001/api/organizations
{
  "name": "Acme AI Corp",
  "email": "demo@acme.com"
}
```
→ Returns: `{ id, name, email, tier, createdAt, ... }`

### 2. Create Assessment
```
POST http://localhost:3001/api/assessments
{
  "organizationId": "<from step 1>",
  "aiSystemId": "system-1",
  "tier": "professional"
}
```
→ Returns: `{ id, organizationId, aiSystemId, ... }`

### 3. Record Answer
```
POST http://localhost:3001/api/assessments/<assessmentId>/answers
{
  "questionId": "q1",
  "score": 3,
  "evidence": "We have an AI governance committee",
  "attestation": "Documented in Q4 audit"
}
```

### 4. Compute Scores
```
POST http://localhost:3001/api/assessments/<assessmentId>/compute-score
{
  "questionMapping": {
    "q1": { "domain": "governance", "description": "AI Governance..." },
    "q2": { "domain": "governance", "description": "..." },
    ...
  }
}
```
→ Returns: `{ domainScores, overallScore, badgeTier, criticalGating, completion, gaps }`

### 5. Issue Badge (if tier 2 + 100% complete)
```
POST http://localhost:3001/api/assessments/<assessmentId>/badges
{
  "organizationId": "<from step 1>",
  "tier": "aligned",
  "overallScore": 3.5,
  "frameworks": ["EU AI Act", "GDPR", "OECD", "ISO/IEC 42001", "NIST AI RMF"]
}
```
→ Returns: `{ id, verificationToken, expiresAt, ... }`

### 6. Verify Badge (Public)
```
GET http://localhost:3001/api/badges/<verificationToken>/verify
```
→ Returns badge metadata + expiry status (no auth needed)

---

## Project Structure

```
certifAI_MVP/
├── README.md                    # Project overview
├── SETUP.md                     # This file
├── CLAUDE.md                    # (Deleted – not in production)
├── index.html                   # Vite entry point
├── vite.config.js               # Vite config
├── package.json                 # Frontend dependencies
├── CertifAI_MVP.jsx             # Entire React app (32Qs, scoring, UI)
├── src/
│   └── main.jsx                 # React mount point
├── dist/                        # Production build (after npm run build)
└── backend/                     # Express.js API
    ├── README.md                # Backend architecture & endpoints
    ├── package.json             # Backend dependencies
    ├── .env                     # Configuration (PORT=3001, LOG_LEVEL=info)
    ├── .env.example             # Template
    ├── .gitignore               # Ignore node_modules, *.db
    ├── db/
    │   ├── schema.sql           # SQLite tables + indexes
    │   └── certifai.db          # Database file (auto-created)
    └── src/
        ├── index.js             # Express server + DI setup
        ├── config/              # Database, logger
        ├── domain/              # Entities, constants
        ├── repositories/        # Data access (Base + specific repos)
        ├── services/            # Business logic (Scoring, Badge, etc.)
        ├── controllers/         # HTTP handlers
        ├── middleware/          # Logging, error handling
        ├── routes/              # API endpoints
        └── utils/               # Validators, helpers
```

---

## Architecture Highlights

### Frontend (CertifAI_MVP.jsx)
- **Single file component** (no splits, preserving original design)
- **Pure scoring functions** (no API calls during assessment)
- **State-driven transitions:** intro → assess → results
- **Props-only communication** (no Redux/Context)
- **JSON export/import** for persistence

### Backend (Express)
- **Clean Architecture:** Controllers → Services → Repositories → Database
- **SOLID principles:** Each service has one responsibility, easily extended
- **Dependency Injection:** Services receive dependencies, not instantiate
- **Repository Pattern:** SQLite swappable for PostgreSQL later
- **Structured logging:** Pino (JSON prod, pretty console dev)
- **Audit trail:** All mutations logged with action, org, IP, timestamp

---

## Database (SQLite)

Auto-created at `backend/db/certifai.db` on first server run.

**Key tables:**
- `organizations` – customer accounts
- `assessments` – assessment instances + metrics
- `assessment_answers` – Q&A data (0-5 scores + evidence)
- `badges` – issued badges (12-month expiry, verification token)
- `subscriptions` – tier + expiry tracking
- `audit_logs` – all mutations (ORG_CREATED, ASSESSMENT_CREATED, etc.)

**Indexes** on assessment lookups, badge expiry, subscription expiry for batch jobs.

---

## Development Notes

### Frontend Customization
- Open `CertifAI_MVP.jsx`
- Modify `QUESTIONS` array to add/edit controls
- Modify `DOMAINS` to adjust domain weights
- Modify theme `C` object for colors
- All scoring logic is in pure functions (no API deps)

### Backend Customization
- Services are loosely coupled via repositories
- Add new service for new domain logic (follows SRP)
- Add new route to expose new endpoint
- Audit logging automatic on all mutations via middleware

### Adding Features (Post-MVP)
1. **Auth:** Add JWT middleware, user roles, org permissions
2. **Email:** Batch renewal reminder job + SMTP service
3. **PDF Dossier:** LLM-assisted answer-to-framework mapping
4. **Dashboard:** Analytics on completion, conversion, NPS
5. **White-label:** Enterprise tier custom branding

---

## Troubleshooting

**Backend fails to start:**
- Ensure port 3001 is free: `netstat -ano | findstr :3001`
- Check logs for database path errors
- Delete `backend/db/certifai.db` and restart (recreates schema)

**CORS errors:**
- Frontend already configured for localhost:5173
- Backend CORS allows both 5173 (dev) and 3000 (fallback)

**Database locked:**
- Kill node process: `taskkill /PID <pid> /F`
- Restart server

---

## Deployment (Next Phase)

**Frontend:**
```bash
npm run build
# Output: dist/
# Deploy to Vercel, Netlify, or any static host
```

**Backend:**
- Dockerfile included (next iteration)
- Railway, Fly.io, Heroku-compatible
- Swap SQLite for PostgreSQL in production

---

## Feedback & Next Steps

- ✅ **MVP ready** for academic presentation (business + flow + design focused)
- 🔄 **Feedback welcome** on scoring logic, badge rules, framework coverage
- 📋 **Post-MVP roadmap:** Auth, email, PDF dossier, analytics, white-label

**Questions?** Check `/backend/README.md` for detailed API docs.
