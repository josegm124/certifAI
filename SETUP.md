# Setup

Requirements: Node.js 18+ and npm.

```bash
npm run install:all
npm run dev:all
```

Open `http://localhost:5173/register`. The API listens on port 3001.

## Backend configuration

Copy `backend/.env.example` to `backend/.env` and configure:

```dotenv
PORT=3001
NODE_ENV=development
RESET_DB_ON_START=false
JWT_SECRET=a-long-private-value
```

Keep `RESET_DB_ON_START=false` for normal development so accounts and saved
assessments survive restarts. Setting it to `true` in development deletes only
the disposable SQLite database and `backend/uploads/` storage.

In production, configure a private `JWT_SECRET`. Evidence uploads are written
under `backend/uploads/evidence/` and are excluded from Git.

Useful commands:

```bash
npm run dev:backend
npm run dev:frontend
npm test
npm run build
```

The active frontend is `frontend/`. `legacy-frontend/` is historical and is not
started by `npm run dev:all`.
