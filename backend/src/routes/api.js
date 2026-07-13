const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { AuditLog } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const { isValidEmail } = require('../utils/validators');

// Factories para inyectar dependencias
const createRoutes = (services) => {
  const {
    companyService,
    userService,
    assessmentService,
    scoringService,
    badgeService,
    subscriptionService,
    auditLogRepository
  } = services;

  // COMPANIES / USERS
  // Single entry point for the HOME form: finds-or-creates the company (by
  // name) and the user/lead (by email) under it, in one call.
  router.post('/companies', async (req, res, next) => {
    try {
      const { name, email, role } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Missing name or email' });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const user = await userService.registerLead(name, email, role || null);
      const company = await companyService.getCompany(user.companyId);

      await auditLogRepository.create(new AuditLog({
        id: uuidv4(),
        companyId: company.id,
        userId: user.id,
        action: 'USER_REGISTERED',
        ipAddress: req.ip
      }));

      res.status(201).json({
        userId: user.id,
        companyId: company.id,
        name: company.name,
        email: user.email,
        role: user.role,
        tier: company.tier,
        createdAt: user.createdAt
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/companies/:id', async (req, res, next) => {
    try {
      const company = await companyService.getCompany(req.params.id);
      if (!company) return res.status(404).json({ error: 'Company not found' });
      res.json(company);
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/:id', async (req, res, next) => {
    try {
      const user = await userService.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  // ASSESSMENTS
  router.post('/assessments', async (req, res, next) => {
    try {
      const { userId, aiSystemId, tier } = req.body;

      const user = await userService.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const assessment = await assessmentService.createAssessment(userId, user.companyId, aiSystemId, tier);

      await auditLogRepository.create(new AuditLog({
        id: uuidv4(),
        companyId: user.companyId,
        userId,
        assessmentId: assessment.id,
        action: 'ASSESSMENT_CREATED',
        ipAddress: req.ip
      }));

      res.status(201).json(assessment);
    } catch (err) {
      next(err);
    }
  });

  router.get('/assessments/:id', async (req, res, next) => {
    try {
      const assessment = await assessmentService.getAssessment(req.params.id);
      if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
      res.json(assessment);
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/:userId/assessments', async (req, res, next) => {
    try {
      const assessments = await assessmentService.getAssessmentsForUser(req.params.userId);
      res.json(assessments);
    } catch (err) {
      next(err);
    }
  });

  // ANSWER
  router.post('/assessments/:assessmentId/answers', async (req, res, next) => {
    try {
      const { questionId, score, evidence, attestation } = req.body;

      if (score === undefined || score === null) {
        return res.status(400).json({ error: 'Score required' });
      }

      const answer = await assessmentService.recordAnswer(
        req.params.assessmentId,
        questionId,
        score,
        evidence,
        attestation
      );

      res.json(answer);
    } catch (err) {
      next(err);
    }
  });

  // SCORING & METRICS
  router.post('/assessments/:assessmentId/compute-score', async (req, res, next) => {
    try {
      const { questionMapping } = req.body;
      const assessment = await assessmentService.getAssessment(req.params.assessmentId);

      if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

      const domainScores = await scoringService.computeDomainScores(req.params.assessmentId, questionMapping);
      const overallScore = scoringService.computeOverallScore(domainScores);
      const criticalGating = await scoringService.checkCriticalGating(req.params.assessmentId, questionMapping);
      const { tier: badgeTier } = scoringService.resolveBadgeTier(overallScore, criticalGating);
      const completion = await scoringService.computeCompletion(req.params.assessmentId, Object.keys(questionMapping).length);
      const gaps = await scoringService.computeGapAnalysis(req.params.assessmentId, domainScores, questionMapping);

      await assessmentService.updateAssessmentMetrics(
        req.params.assessmentId,
        completion,
        overallScore,
        badgeTier,
        criticalGating
      );

      res.json({
        domainScores,
        overallScore,
        badgeTier,
        criticalGating,
        completion,
        gaps: gaps.slice(0, 10) // Top 10 gaps
      });
    } catch (err) {
      next(err);
    }
  });

  // BADGES (the certified entity is the company)
  router.post('/assessments/:assessmentId/badges', async (req, res, next) => {
    try {
      const { companyId, tier, overallScore, frameworks } = req.body;

      const badge = await badgeService.issueBadge(
        req.params.assessmentId,
        companyId,
        tier,
        overallScore,
        frameworks || []
      );

      res.status(201).json(badge);
    } catch (err) {
      next(err);
    }
  });

  router.get('/badges/:token/verify', async (req, res, next) => {
    try {
      const badge = await badgeService.verifyBadge(req.params.token);

      if (!badge) {
        return res.status(404).json({ error: 'Badge not found or expired' });
      }

      res.json({
        ...badge,
        metadata: badgeService.getBadgeMetadata(badge.tier)
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/companies/:companyId/badges', async (req, res, next) => {
    try {
      const badges = await badgeService.badgeRepository.findByCompany(req.params.companyId);
      const activeBadges = badges.filter(b => !b.isExpired());
      res.json(activeBadges);
    } catch (err) {
      next(err);
    }
  });

  // SUBSCRIPTIONS
  router.get('/companies/:companyId/subscription', async (req, res, next) => {
    try {
      const subscription = await subscriptionService.getSubscription(req.params.companyId);
      const features = subscription
        ? subscriptionService.getTierFeatures(subscription.tier)
        : subscriptionService.getTierFeatures('free');

      res.json({
        subscription: subscription || { tier: 'free', status: 'active' },
        features
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/companies/:companyId/upgrade-tier', async (req, res, next) => {
    try {
      const { newTier } = req.body;

      if (!newTier) {
        return res.status(400).json({ error: 'newTier required' });
      }

      const subscription = await subscriptionService.upgradeTier(req.params.companyId, newTier);

      await auditLogRepository.create(new AuditLog({
        id: uuidv4(),
        companyId: req.params.companyId,
        action: 'TIER_UPGRADED',
        details: { from: subscription.tier, to: newTier },
        ipAddress: req.ip
      }));

      res.json(subscription);
    } catch (err) {
      next(err);
    }
  });

  // EXPORT/IMPORT
  router.get('/assessments/:assessmentId/export', async (req, res, next) => {
    try {
      const data = await assessmentService.exportAssessment(req.params.assessmentId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  router.post('/users/:userId/import-assessment', async (req, res, next) => {
    try {
      const assessment = await assessmentService.importAssessment(req.params.userId, req.body);
      const user = await userService.getUser(req.params.userId);

      await auditLogRepository.create(new AuditLog({
        id: uuidv4(),
        companyId: user?.companyId || null,
        userId: req.params.userId,
        assessmentId: assessment.id,
        action: 'ASSESSMENT_IMPORTED',
        ipAddress: req.ip
      }));

      res.status(201).json(assessment);
    } catch (err) {
      next(err);
    }
  });

  // ANALYTICS
  router.get('/analytics/badges-renewing', async (req, res, next) => {
    try {
      const daysThreshold = req.query.days || 60;
      const badges = await badgeService.findRenewingSoon(daysThreshold);
      res.json({
        count: badges.length,
        daysThreshold,
        badges: badges.slice(0, 50)
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

module.exports = { createRoutes };
