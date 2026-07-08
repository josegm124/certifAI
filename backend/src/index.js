require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const { initializeDatabase, runSchema, getDb } = require('./config/database');
const { requestLogger, errorHandler } = require('./middleware/logging');

// Repositories
const OrganizationRepository = require('./repositories/OrganizationRepository');
const AssessmentRepository = require('./repositories/AssessmentRepository');
const AssessmentAnswerRepository = require('./repositories/AssessmentAnswerRepository');
const AiSystemRepository = require('./repositories/AiSystemRepository');
const BadgeRepository = require('./repositories/BadgeRepository');
const AuditLogRepository = require('./repositories/AuditLogRepository');

// Services
const OrganizationService = require('./services/OrganizationService');
const AssessmentService = require('./services/AssessmentService');
const ScoringService = require('./services/ScoringService');
const BadgeService = require('./services/BadgeService');
const SubscriptionService = require('./services/SubscriptionService');

// Routes
const { createRoutes } = require('./routes/api');

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
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
    const organizationRepository = new OrganizationRepository(db);
    const assessmentRepository = new AssessmentRepository(db);
    const answerRepository = new AssessmentAnswerRepository(db);
    const aiSystemRepository = new AiSystemRepository(db);
    const badgeRepository = new BadgeRepository(db);
    const auditLogRepository = new AuditLogRepository(db);

    // Instantiate services
    const organizationService = new OrganizationService(organizationRepository);
    const assessmentService = new AssessmentService(
      assessmentRepository,
      answerRepository,
      aiSystemRepository,
      auditLogRepository
    );
    const scoringService = new ScoringService(answerRepository);
    const badgeService = new BadgeService(badgeRepository, assessmentRepository);
    const subscriptionService = new SubscriptionService(
      {
        create: () => {},
        findByOrg: async () => null,
        update: () => {}
      },
      organizationRepository
    );

    // Create routes with dependency injection
    const routes = createRoutes({
      organizationService,
      assessmentService,
      scoringService,
      badgeService,
      subscriptionService,
      auditLogRepository
    });

    app.use('/api', routes);

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
