# CertifAI – Complete Testing Guide

## Overview

This document explains how to test the complete happy path flow:
1. **Tier 1 (Free)** – Answer 32 questions, see results
2. **Upgrade** – Switch to Tier 2 (Professional)
3. **Tier 2** – Add evidence, earn badge
4. **Verification** – Verify badge via public link

All endpoints are documented in `backend/ENDPOINTS.md`.

---

## Prerequisites

✅ Backend running on `http://localhost:3001`
✅ Frontend running on `http://localhost:5173`
✅ PowerShell (for test scripts)
✅ Database clean (run `RESET_DB.ps1` first if testing multiple times)

---

## Quickstart: Run Full Test Suite

### Option 1: Automated Happy Path Test (Recommended)

This script tests the complete flow end-to-end:

```powershell
# In PowerShell, run:
cd C:\Users\jose.guerrero_isol\Desktop\certifAI_MVP\backend
.\TEST_HAPPY_PATH.ps1
```

**What it does:**
1. Creates organization
2. Creates Tier 1 assessment + saves 32 answers
3. Computes scores
4. Upgrades to Tier 2 assessment
5. Copies answers to Tier 2
6. Computes scores again
7. Issues badge (if complete + tier 2)
8. Verifies badge via public endpoint
9. Displays summary

**Expected Output:**
```
====== CERTIFAI HAPPY PATH TEST ======
Testing: Tier 1 -> Upgrade -> Tier 2 -> Badge

1️⃣  Creating Organization...
   ✓ Organization ID: org-abc123...
   ✓ Name: Test Corp Academic
   ✓ Tier: free

2️⃣  Creating Tier 1 Assessment (Free)...
   ✓ Assessment 1 ID: assess-def456...
   ✓ Tier: free

3️⃣  Recording 32 Answers (Tier 1)...
   ✓ Saved 8/32 answers
   ✓ Total answers saved: 32/32

4️⃣  Computing Scores (Tier 1)...
   ✓ Overall Score: 3.5/5
   ✓ Badge Tier: aligned
   ✓ Completion: 100%
   ✓ Gaps Found: 8

5️⃣  Upgrading to Tier 2 (Professional)...
   ✓ Assessment 2 ID (Professional): assess-ghi789...
   ✓ Tier: professional

6️⃣  Copying 32 Answers to Tier 2...
   ✓ Copied 32/32 answers to Tier 2

7️⃣  Computing Scores (Tier 2)...
   ✓ Overall Score: 3.5/5
   ✓ Badge Tier: aligned
   ✓ Completion: 100%

8️⃣  Issuing Badge...
   ✓ Badge ID: badge-xyz...
   ✓ Tier: aligned
   ✓ Issued: 2026-07-08T19:30:00Z
   ✓ Expires: 2027-07-08T19:30:00Z
   ✓ Verification Token: abc123def456...

9️⃣  Verifying Badge (Public Endpoint)...
   ✓ Badge verified successfully!
   ✓ Tier: aligned
   ✓ Expired: No ✓

====== TEST SUMMARY ======

✅ Organization: Test Corp Academic (org-abc123...)
✅ Tier 1 Assessment: assess-def456... (free)
✅ Tier 2 Assessment: assess-ghi789... (professional)
✅ Answers Recorded: 32 per assessment = 64 total
✅ Scores Computed: Both tiers
✅ Badge Issued: aligned (expires 2027-07-08)
✅ Badge Verified: Token valid, public accessible

🔗 PUBLIC SHARE LINK (no login needed):
http://localhost:5173?verify=abc123def456...

✅ HAPPY PATH TEST PASSED
```

---

### Option 2: Manual Testing (Browser)

Open `http://localhost:5173` and:

1. **Intro Screen:**
   - Enter org name: `Test Manual`
   - Select "Start free assessment"

2. **Assessment (Tier 1):**
   - Answer all 32 questions (score 3 each)
   - Click "Finish assessment"

3. **Results (Tier 1):**
   - See score dial (should be ~60%)
   - See badge tier (Aligned or Assured)
   - See gap analysis
   - Click "Upgrade to Tier 2" → "Add evidence"

4. **Assessment (Tier 2):**
   - All 32 answers are auto-filled (copied from Tier 1)
   - Add evidence to each (or skip, optional)
   - Click "Finish assessment"

5. **Results (Tier 2):**
   - See badge issued (if 100% complete)
   - See verification token
   - See expiry date (12 months from now)
   - Click "Share verification link"

6. **Verify Badge:**
   - Copy verification link
   - Open in new tab (or incognito)
   - Badge displays without login ✓

---

## Reset Database (Start Clean)

Before running tests multiple times, reset the database:

```powershell
cd C:\Users\jose.guerrero_isol\Desktop\certifAI_MVP
.\backend\RESET_DB.ps1
```

Then:
1. Restart backend server: `cd backend && npm start`
2. Database recreates with fresh schema
3. Run test script again

---

## What Gets Created in Database

After running `TEST_HAPPY_PATH.ps1`:

**organizations** (1 row)
```
id: org-abc123...
name: Test Corp Academic
email: academic@certifai.local
tier: free
```

**ai_systems** (1 row)
```
id: system-1234567
organizationId: org-abc123...
name: System system-123
```

**assessments** (2 rows)
```
id: assess-def456... | tier: free | overallScore: 3.5
id: assess-ghi789... | tier: professional | overallScore: 3.5
```

**assessment_answers** (64 rows = 32 per assessment)
```
assessmentId: assess-def456... | questionId: 1 | score: 3
assessmentId: assess-def456... | questionId: 2 | score: 4
...
assessmentId: assess-ghi789... | questionId: 1 | score: 3
assessmentId: assess-ghi789... | questionId: 2 | score: 4
```

**domain_scores** (16 rows = 8 domains × 2 assessments)
```
assessmentId: assess-def456... | domain: strategy | score: 3.5
assessmentId: assess-def456... | domain: governance | score: 3.2
...
```

**badges** (1 row)
```
id: badge-xyz...
assessmentId: assess-ghi789... (Tier 2 only)
organizationId: org-abc123...
tier: aligned
score: 3.5
verificationToken: abc123def456ghi789...
expiresAt: 2027-07-08T...
```

**audit_logs** (5 rows)
```
action: ORG_CREATED
action: ASSESSMENT_CREATED (×2)
action: (answers created via answers endpoint, logged in logs)
```

---

## Endpoint Reference

See `backend/ENDPOINTS.md` for:
- All POST/GET endpoints
- Request/response bodies
- Example queries

**Quick Reference:**
```
POST   /organizations                      Create org
POST   /assessments                        Create assessment
POST   /assessments/:id/answers            Record answer
POST   /assessments/:id/compute-score      Calculate scores
POST   /assessments/:id/badges             Issue badge
GET    /badges/:token/verify               Verify badge (public)
GET    /organizations/:id/badges           List org badges
```

---

## Troubleshooting

### "Failed to connect to localhost:3001"
- Backend not running. Start it: `cd backend && npm start`

### "SQLITE_CONSTRAINT: UNIQUE constraint failed"
- Database has duplicate data. Run: `.\backend\RESET_DB.ps1`
- Restart server

### "Cannot read property 'id' of undefined"
- API returned error. Check backend logs for SQL/validation errors

### Badge not issued
- Check completion is 100%
- Check tier is "professional" (not "free")
- Check overall score computed correctly

---

## Next: Presentation

Once all tests pass ✅:

1. **Show the business flow:**
   - Free assessment (no commitment)
   - Upgrade to paid (evidence + badge)
   - Badge renewal (12 months → revenue)

2. **Show the technical stack:**
   - React + Vite (clean, no build bloat)
   - Express + SQLite (clean architecture, SOLID)
   - Real scoring engine (domain weights, critical gating)
   - Audit trail (all mutations logged)

3. **Show the MVP ready:**
   - 32 controls × 8 domains
   - 7 frameworks consolidated
   - Badge as deal-closer
   - Public verification (no login)

---

## Files

- `ENDPOINTS.md` – Complete API reference
- `TEST_HAPPY_PATH.ps1` – Automated test script
- `RESET_DB.ps1` – Reset database
- `backend/README.md` – Backend architecture
- `SETUP.md` – Setup instructions
- `HAPPY_PATH.md` – Manual testing guide

---

✅ **Ready to test?** Start with `TEST_HAPPY_PATH.ps1`
