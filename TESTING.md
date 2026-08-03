# Testing

```bash
npm test
npm run build
```

The backend tests cover server-side scoring, critical gating, the Tier 1 badge
restriction, salted password verification and five-hour JWT validation. The
frontend tests cover the scoring presentation helpers and 4A ladder.

API integration checks should cover:

- protected route without cookie returns 401;
- duplicate company/email returns 409 after normalization;
- invalid or cross-domain question returns 400;
- incomplete finalization returns 409;
- nine valid domain PUTs persist 36 answers;
- Tier 2 evidence plus signature can issue and publicly verify a badge;
- repeated finalization returns the same badge;
- Tier 1 completion returns an official score and no badge.

`npm run dev:all` must expose both `/api/health` on port 3001 and the React routes
on port 5173.

Starting the backend must also create the three dated files in `backend/logs/`.
Successful registration should add `account.registered` to the audit file and
every request should add `http.request` with numeric `durationMs` to metrics.
