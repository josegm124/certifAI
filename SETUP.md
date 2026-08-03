# CertifAI MVP - Setup and Launch

## Requirements

- Node.js 18 or newer
- npm
- No external database: the backend uses SQLite

## Install and run

From the repository root:

```bash
npm run install:all
npm run dev:all
```

The launcher starts the backend first and then the frontend:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`
- Health check: `http://localhost:3001/api/health`

The two-terminal workflow also remains available:

```bash
npm run dev:backend
npm run dev:frontend
```

## Current MVP scope

### Frontend

- React 18, TypeScript and Vite
- Intake with organisation, work email, role and tier
- 36 questions across 9 domains
- 0-5 answer scale and 0-100 result scale
- Four levels: Aware, Aligned, Assured and Advanced
- Framework coverage across 7 frameworks
- Evidence notes and self-certification flow for Tier 2
- Local preview when the backend is unavailable

### Backend

- Express and SQLite
- Company and lead registration
- Assessment and answer persistence
- Result eligibility checks and badge issuance
- Public JSON and HTML badge verification
- Export/import, structured logging and selected audit events

Known limitations: there is no authentication or AI integration, checkout is intentionally inactive, subscriptions are not fully persisted, and the backend accepts the frontend-computed overall score after bounds validation rather than recalculating it.

## API flow used by the frontend

### 1. Register company and lead

```http
POST /api/companies
Content-Type: application/json

{
  "name": "Acme AI Corp",
  "email": "demo@acme.com",
  "role": "Compliance / Risk"
}
```

The response includes `userId` and `companyId`.

### 2. Create assessment

```http
POST /api/assessments
Content-Type: application/json

{
  "userId": "<userId>",
  "aiSystemId": "system-1",
  "tier": "professional"
}
```

### 3. Record answers

```http
POST /api/assessments/<assessmentId>/answers
Content-Type: application/json

{
  "questionId": "1",
  "score": 3,
  "evidence": "AI governance policy",
  "attestation": "confirmed"
}
```

Repeat for the 36 questions.

### 4. Submit result

The application builds the payload with `frontend/src/lib/api.ts` and sends:

```http
POST /api/assessments/<assessmentId>/result
```

`/result` is the only normal frontend path that records the result and issues a badge. The retired `/compute-score` endpoint does not exist.

### 5. Verify badge

```http
GET /api/badges/<verificationToken>/verify
```

The public HTML page is:

```text
http://localhost:3001/verify/<verificationToken>
```

## Validation commands

```bash
npm test
npm run build
```

The current automated unit suite covers frontend scoring. The backend JavaScript can additionally be syntax-checked with `node --check`; the PowerShell happy-path scripts require a running backend.

## Environment

Copy `backend/.env.example` to `backend/.env` when environment overrides are needed. Important values include `PORT`, `NODE_ENV`, `RESET_DB_ON_START`, `PUBLIC_BASE_URL` and `APP_URL`.

When `NODE_ENV=development`, the database resets on startup unless `RESET_DB_ON_START=false`.
