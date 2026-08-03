# CertifAI - Arquitectura del MVP

## Componentes

```text
React 18 + TypeScript + Vite
            |
            | HTTP/JSON
            v
Express routes -> Services -> Repositories -> SQLite
```

- `frontend/` es la aplicacion activa.
- `legacy-frontend/` conserva el MVP anterior como referencia.
- `backend/` contiene la API, servicios, repositorios y SQLite.
- No existe autenticacion. La verificacion de badges es publica por diseno; JWT y roles quedan en el roadmap.
- No hay llamadas a modelos de IA. Los resultados y recomendaciones son deterministas.

## Instrumento y scoring

- 36 preguntas en 9 dominios.
- Cada respuesta usa una escala de 0 a 5.
- El resultado general y los resultados por dominio usan una escala de 0 a 100.
- Los niveles son Aware (0-40), Aligned (41-65), Assured (66-85) y Advanced (86-100).
- El frontend calcula el preview con `frontend/src/lib/scoring.ts`.
- `POST /api/assessments/:id/result` valida el payload, vuelve a comprobar finalizacion, evidencia y controles criticos desde las respuestas guardadas, decide el nivel y puede emitir el badge.
- Limitacion conocida: el backend valida, pero no recalcula, el `overallScore` enviado por el frontend. No se debe presentar como scoring completamente server-side.

## Flujo principal

1. `POST /api/companies` registra o recupera la empresa y el lead.
2. `POST /api/assessments` crea el assessment.
3. `POST /api/assessments/:id/answers` guarda cada respuesta.
4. `POST /api/assessments/:id/result` guarda el resultado y emite el badge cuando corresponde.
5. `GET /api/badges/:token/verify` devuelve la verificacion publica en JSON.
6. `GET /verify/:token` muestra la pagina publica del badge.

El endpoint retirado `POST /api/assessments/:id/compute-score` ya no forma parte de la API.

## Reglas para emitir un badge

- El assessment debe tener 100% de finalizacion.
- Tier 1/free queda limitado a Aware y no obtiene badge.
- Q17, Q18 o Q26 con score menor o igual a 1 limita el resultado a Aware.
- Aligned o superior requiere evidencia guardada.
- Assured y Advanced requieren autocertificacion firmada.
- Aware es una senal interna, no una credencial publica.

## Ejecucion local

```bash
npm run install:all
npm run dev:all
```

- Aplicacion: `http://localhost:5173`
- API: `http://localhost:3001/api`
- Verificacion publica: `http://localhost:3001/verify/<token>`

## Persistencia y auditoria

SQLite guarda empresas, leads, assessments, respuestas, badges y eventos de auditoria. Las operaciones principales como registro, creacion de assessment, emision de badge, cambio de tier e importacion generan eventos. No todas las mutaciones estan auditadas; guardar respuestas y actualizar resultados no crean actualmente un evento de auditoria.
