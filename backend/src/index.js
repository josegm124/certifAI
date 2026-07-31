require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const { initializeDatabase, runSchema, getDb } = require('./config/database');
const { requestLogger, errorHandler } = require('./middleware/logging');

// Repositories
const CompanyRepository = require('./repositories/CompanyRepository');
const UserRepository = require('./repositories/UserRepository');
const AssessmentRepository = require('./repositories/AssessmentRepository');
const AssessmentAnswerRepository = require('./repositories/AssessmentAnswerRepository');
const AiSystemRepository = require('./repositories/AiSystemRepository');
const BadgeRepository = require('./repositories/BadgeRepository');
const AuditLogRepository = require('./repositories/AuditLogRepository');

// Services
const CompanyService = require('./services/CompanyService');
const UserService = require('./services/UserService');
const AssessmentService = require('./services/AssessmentService');
const ScoringService = require('./services/ScoringService');
const AssessmentResultService = require('./services/AssessmentResultService');
const BadgeService = require('./services/BadgeService');
const SubscriptionService = require('./services/SubscriptionService');

// Routes
const { createRoutes } = require('./routes/api');
const { createVerifyRoutes } = require('./routes/verify');

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
// 5174 is legacy-frontend/ running side by side with frontend/ for comparison.
// Without it the legacy build silently fell back to local scoring and looked
// like it was talking to this backend when it was not. Local dev origins only.
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(requestLogger);

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught Exception');
  process.exit(1);
});

// Initialize
const startServer = async () => {
  try {
    logger.info('Initializing database...');
    await initializeDatabase();
    await runSchema();

    // Instantiate repositories
    const db = getDb();
    const companyRepository = new CompanyRepository(db);
    const userRepository = new UserRepository(db);
    const assessmentRepository = new AssessmentRepository(db);
    const answerRepository = new AssessmentAnswerRepository(db);
    const aiSystemRepository = new AiSystemRepository(db);
    const badgeRepository = new BadgeRepository(db);
    const auditLogRepository = new AuditLogRepository(db);

    // Instantiate services
    const companyService = new CompanyService(companyRepository);
    const userService = new UserService(userRepository, companyService);
    const assessmentService = new AssessmentService(
      assessmentRepository,
      answerRepository,
      aiSystemRepository,
      auditLogRepository
    );
    const scoringService = new ScoringService(answerRepository);
    const resultService = new AssessmentResultService(answerRepository);
    const badgeService = new BadgeService(badgeRepository, assessmentRepository);
    const subscriptionService = new SubscriptionService(
      {
        create: () => {},
        findByCompany: async () => null,
        update: () => {}
      },
      companyRepository
    );

    // Create routes with dependency injection
    const routes = createRoutes({
      companyService,
      userService,
      assessmentService,
      scoringService,
      resultService,
      badgeService,
      subscriptionService,
      auditLogRepository
    });

    app.use('/api', routes);

    // Public server-rendered verification pages (with OpenGraph tags for
    // social previews). Mounted at root so URLs are /verify/:token.
    app.use('/', createVerifyRoutes({ badgeService, companyService }));

    // Landing on the API port by mistake is easy and common — this port serves
    // no app. Say so, instead of Express's bare "Cannot GET /".
    app.get('/', (req, res) => {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      res.type('html').send(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CertifAI API — not the app</title>
<style>body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;background:#0b1220;color:#e6edf7;display:grid;place-items:center;min-height:100vh;padding:1.5rem}
.c{max-width:520px}h1{font-size:1.4rem;margin:0 0 .5rem}p{color:#93a4c0;line-height:1.6;margin:0 0 1rem}
a.btn{display:inline-block;background:#2f81f7;color:#fff;text-decoration:none;padding:.6rem 1.1rem;border-radius:8px;font-weight:600}
code{background:#111a2e;border:1px solid #233048;padding:.15rem .4rem;border-radius:5px;font-size:.85rem}
ul{color:#93a4c0;line-height:1.9;padding-left:1.1rem}</style>
</head><body><div class="c">
<h1>This is the CertifAI API, not the app.</h1>
<p>Port ${PORT} serves data and the public badge pages. It has no interface of its own.</p>
<p><a class="btn" href="${appUrl}">Open the app →</a></p>
<p>What does live here:</p>
<ul>
  <li><code>GET /api/health</code></li>
  <li><code>GET /api/badges/:token/verify</code> — public badge check</li>
  <li><code>GET /verify/:token</code> — public badge page</li>
</ul>
<p>If the app link doesn't load, its dev server isn't running: <code>npm --prefix frontend run dev</code></p>
</div></body></html>`);
    });

    // Error handler (must be last)
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      logger.info({ port: PORT }, `Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

module.exports = app;
