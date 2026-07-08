# CertifAI – Happy Path Testing (Complete Flow)

**Objetivo:** Probar el flujo completo de assessment → badge issuance.

---

## 🚀 PASO 1: LEVANTAR TODO (1 TERMINAL)

### PowerShell Script (Recomendado)

Copia esto en PowerShell:

```powershell
# Terminal 1 - Backend
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'C:\Users\jose.guerrero_isol\Desktop\certifAI_MVP\backend'; npm start`""

# Wait for backend to start
Start-Sleep -Seconds 3

# Terminal 2 - Frontend
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'C:\Users\jose.guerrero_isol\Desktop\certifAI_MVP'; npm run dev`""

Write-Host "✅ BACKEND: http://localhost:3001" -ForegroundColor Green
Write-Host "✅ FRONTEND: http://localhost:5173" -ForegroundColor Green
Write-Host "Espera 5-10 segundos para que ambos se levanten..." -ForegroundColor Yellow
```

---

## 🧪 PASO 2: HAPPY PATH (MANUAL EN BROWSER)

Abre **http://localhost:5173** en el navegador.

### 2.1 – INTRO (Tier Selection)

1. **Ingresa nombre de organización:**
   ```
   Test Corp AI
   ```

2. **Selecciona "Tier 2 · Evidence & Badge"** (azul, derecha)
   - Esto te permitirá ver el badge al terminar

3. **Click: "Start with evidence"**
   - Backend crea `organization` + `assessment`
   - Transición a ASSESS view

---

### 2.2 – ASSESSMENT (32 Questions)

Verás una pregunta por vez. **Responde todas las 32:**

**Opción rápida (todas a score 3):**

```javascript
// Abre DevTools (F12), copia esto en Console:
for(let i=1; i<=32; i++) {
  document.querySelectorAll('input[type="radio"]')[i*5-3]?.click();
}
```

O **responde manualmente:**
- Cada pregunta: click score (0-5)
- Tier 2: agrega "Evidence" + "Attestation" (opcional)
- Click "Next →" o flechas del teclado
- Header muestra progreso (ej: 5/32)

**Cuando llegues a Q32:**
- Click "Finish assessment" → Calculates scores
- Backend calcula: domain scores, overall, badge tier
- Transición a RESULTS

---

### 2.3 – RESULTS (Score Display + Badge Issuance)

Deberías ver:

```
✓ Overall Readiness: 60 (en el dial)
✓ Badge Tier: "ALIGNED" (o tu tier según score)
✓ Maturity by Domain: 8 barras con %
✓ Framework Coverage: 7 anillos (EU AI Act, GDPR, etc.)
✓ Priority Remediation: Top 8 gaps to fix
```

**Si Tier 2 + 100% complete:**
- Badge se emite automáticamente
- Verás:
  ```
  ✓ Badge issued on [fecha]
  Token: abc123def456...
  Expires: [fecha + 12 meses]
  → Share verification link
  ```

---

## 🔍 PASO 3: VERIFICAR BADGE (Public Link)

### 3.1 – Copiar Link

En Results, en la sección Badge:
```
Share verification link
→ Click el link o copia la URL
```

Debería ser algo como:
```
http://localhost:5173?verify=abc123def456ghi789...
```

### 3.2 – Verificar en Backend (Curl)

Abre otra terminal y ejecuta:

```bash
# Reemplaza abc123... con tu token real
curl http://localhost:3001/api/badges/abc123def456ghi789/verify

# Debería retornar:
{
  "id": "badge-...",
  "tier": "aligned",
  "score": 3.0,
  "issuedAt": "2026-07-08T...",
  "expiresAt": "2027-07-08T...",
  "verificationToken": "abc123...",
  "organizationId": "...",
  "assessmentId": "..."
}
```

---

## 📊 QUÉ PASA EN BACKEND (Behind Scenes)

### Call Flow:

```
1. POST /api/organizations
   → ORG_CREATED (audit log)
   → Returns: { id, name, email, tier }

2. POST /api/assessments
   → ASSESSMENT_CREATED (audit log)
   → Returns: { id, organizationId, aiSystemId }

3. POST /api/assessments/:id/answers (loop x 32)
   → Saves each answer (score + evidence)
   → Returns: { id, questionId, score }

4. POST /api/assessments/:id/compute-score
   → Computes: domainScores, overallScore, badgeTier, gaps
   → Returns: { domainScores, overallScore, badgeTier, gaps }

5. POST /api/assessments/:id/badges (auto when tier 2 + 100%)
   → Issues badge with:
     - verificationToken (UUID)
     - expiresAt (now + 12 months)
     - tier (aware/aligned/assured)
     - score (overall)
   → Returns: { id, verificationToken, expiresAt, issuedAt }

6. GET /api/badges/:token/verify (public)
   → Verifies token is valid + not expired
   → Returns: badge metadata
```

### Database:

```sql
-- Check what was created:
SELECT * FROM organizations;              -- 1 org
SELECT * FROM assessments;                -- 1 assessment
SELECT * FROM assessment_answers;         -- 32 answers
SELECT * FROM badges;                     -- 1 badge (if tier 2 + complete)
SELECT * FROM audit_logs;                 -- All mutations logged
```

---

## ✅ HAPPY PATH CHECKLIST

- [ ] Frontend starts on http://localhost:5173
- [ ] Backend starts on http://localhost:3001
- [ ] Can enter org name + select Tier 2
- [ ] Can answer all 32 questions
- [ ] Can see Results with score dial + badge tier
- [ ] Badge emitted automatically when 100% complete (Tier 2)
- [ ] Can see badge token + expiry date
- [ ] Can click "Share verification link"
- [ ] Can verify badge via curl (GET /api/badges/:token/verify)

---

## 🐛 Troubleshooting

**"Failed to start assessment. Check backend is running..."**
- Backend no está corriendo en puerto 3001
- Verifica Terminal 2: `npm start` en /backend
- Si ya está corriendo: `taskkill /PID <pid> /F` y reinicia

**"Cannot read property 'id' of undefined"**
- La API retornó error
- Chequea console del browser (F12) para ver request/response
- Chequea logs del backend para errores de DB

**No se vé badge después de terminar**
- Si Tier 1: No hay badge (es normal)
- Si Tier 2 + no 100%: Complete todas las 32 preguntas
- Si está "Processing badge...": Espera 2-3 segundos

**No puedo responder una pregunta**
- Algunas preguntas pueden tener elementos deshabilitados (UX design)
- Usa DevTools Console para simular respuestas (ver arriba)

---

## 📸 Expected Output (Tier 2 + 100%)

```
┌────────────────────────────────────┐
│ AI Governance Readiness            │
│ Test Corp AI                       │
├────────────────────────────────────┤
│                                    │
│  [DIAL: 60 / 100]   [BADGE PANEL] │
│                     ✓ Aligned      │
│                     Issued: 2026.. │
│                     Expires: 2027..│
│                     Token: abc123..│
│                     Share link     │
│                                    │
├────────────────────────────────────┤
│ Maturity by Domain                 │
│ ▓▓▓▓░░ Governance (60%)             │
│ ▓▓▓░░░ Risk (50%)                  │
│ ... (8 total)                      │
├────────────────────────────────────┤
│ Framework Coverage                 │
│ EU AI Act: 65%                     │
│ GDPR: 70%                          │
│ ... (7 total)                      │
├────────────────────────────────────┤
│ Priority Remediation               │
│ 1. [Q5 - Critical] AI Governance   │
│ 2. [Q12] Risk Assessments          │
│ ... (top 8)                        │
└────────────────────────────────────┘
```

---

## 🎯 Next: What to Present

After happy path works:

1. **Show the flow:** Intro → Assessment → Results → Badge
2. **Show the badge:** Real token, 12-month expiry
3. **Show verification:** Click share link, badge is public (no login)
4. **Show the stack:**
   - React + Vite (frontend, clean UX)
   - Express + SQLite (backend, clean architecture)
   - Real scoring engine (domain weights, critical gating)
   - Audit trail (all mutations logged)

**For Academic Panel:** Emphasize:
- ✅ Business model clear (Freemium tiers)
- ✅ Flow intuitive (one Q at a time)
- ✅ Badge as deal-closer (shareable, expires 12mo, renewal driver)
- ✅ Architecture solid (SOLID, DI, clean layers)
- ✅ Data-driven (gap analysis, framework coverage)

---

Listo para empezar? 👉 PowerShell script arriba ⬆️
