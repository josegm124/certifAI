# Backend Completado – Arquitectura & Resumen

## Arquitectura Implementada

Clean Architecture + SOLID + DI (Dependency Injection)

Controllers → Services → Repositories → SQLite

Patrones:
- Repository Pattern – Data abstraction (SQLite ↔ Postgres fácil después)
- Service Layer – Toda lógica de negocio aquí (ScoringService, BadgeService, etc.)
- Dependency Injection – Services reciben dependencias, no crean
- Factory Pattern – Badge creation con metadata
- Observer-ready – Audit logs en todo mutation

SOLID Principles:
- SRP – Cada servicio = 1 responsabilidad (no mixed concerns)
- OCP – Extensible (agregar frameworks sin modificar scoring)
- LSP – Repositories consistentes
- ISP – Services pequeños, no god objects
- DIP – Depend on abstractions (repositories), no concrete classes

# Stack Final

Frontend: React 18 + Vite + CertifAI_MVP.jsx (original file intacto)
Backend: Express.js + SQLite + Pino logger
Database: SQLite (file-based, 0 setup) con schema + indexes

---
# INICIO (Getting Started)

## Prerequisitos
- **Node.js 18+** y **npm** (verifica con `node -v` y `npm -v`)
- No requiere instalar ninguna base de datos: SQLite es file-based y se crea sola.

## 1. Clonar el repo
```bash
git clone <repo-url>
cd certifAI_MVP
```

## 2. Backend (Terminal 1)
```bash
cd backend
cp .env.example .env      # Windows PowerShell: copy .env.example .env
npm install
npm start
```
→ Corre en http://localhost:3001
El backend crea la base de datos SQLite y el schema automáticamente al arrancar.
En modo dev (`.env` por defecto) resetea la DB en cada arranque — como Spring create-drop.

## 3. Frontend (Terminal 2)
```bash
cd certifAI_MVP        # raíz del proyecto (no la carpeta backend)
npm install
npm run dev
```
→ Abre en http://localhost:5173

> **Nota:** arranca primero el backend. El frontend en :5173 llama a la API en :3001.

User Flow (Lo que ves)

1. Intro: Ingresas nombre org + email → tier 1 (free) o tier 2 (professional)
2. Assessment: Respondes 32 preguntas (one-by-one)
  - Tier 2 muestra evidencia + attestation campos
  - Sidebar muestra dominios (8) para navegar
3. Results: Ves
  - Score por dominio (%)
  - Score overall (0-5, ponderado)
  - Badge tier (Aware/Aligned/Assured) con gating logic
  - Gap analysis (top 10 items to fix, priorizados)
  - Framework coverage rings (7 frameworks)
  - JSON export/import buttons

# El frontend llama estos endpoints:

1. POST /api/organizations           → crear org
2. POST /api/assessments             → crear assessment
3. POST /api/assessments/:id/answers → guardar respuestas (loop)
4. POST /api/assessments/:id/compute-score → calcular scores + gaps
5. POST /api/assessments/:id/badges  → emitir badge (si tier 2 + 100%)
6. GET  /api/badges/:token/verify    → link público para compartir badge