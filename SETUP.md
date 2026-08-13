# Setup

Requirements: Node.js 18+ and npm.

```bash
npm run install:all
npm run dev:all
```

Open `http://localhost:5173/register`. The API listens on port 3001.

Backend configuration is in `backend/.env`:

```dotenv
PORT=3001
NODE_ENV=development
RESET_DB_ON_START=false
JWT_SECRET=a-long-private-value
```

Keep reset disabled for normal use so login and saved domains survive a server
restart. Enable it only for a deliberate disposable test run. In production,
the backend refuses to start without `JWT_SECRET`.

Tier 2 is free during the demo and displays a notice before creation. Checkout,
password recovery, multi-user companies and real file uploads are outside this
MVP.
