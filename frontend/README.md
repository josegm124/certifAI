# CertifAI Frontend

React 18, TypeScript, Vite, React Router, Zustand and Framer Motion.

Routes include `/register`, `/login`, `/profile`, `/dashboard`, `/start`,
`/assess` and `/results`. Protected routes wait for `/api/auth/me`; assessment
routes also require an active or selected assessment.

The frontend never stores the JWT. It is an HttpOnly backend cookie. Zustand
persists only answers in domains that have not yet been acknowledged by the
backend. On login or reload, the active assessment is recovered from SQLite and
the pending local domain is merged on top so a failed request is not lost.

The browser may use the shared presentation helpers for charts and remediation,
but the official score, level, critical gate and badge shown after finalization
come from the backend response.

When finalization produces a public badge, the result page displays **Print
certificate** and applies a print layout that removes navigation controls.

```bash
npm run dev
npm run test
npm run build
```
