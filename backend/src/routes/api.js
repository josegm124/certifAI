const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { AuditLog, BADGE_TIERS } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const { isValidEmail } = require('../utils/validators');

// Factories para inyectar dependencias
const createRoutes = (services) => {
  const {
    companyService,
    userService,
    assessmentService,
    resultService,
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
  //
  // POST /assessments/:id/compute-score was REMOVED. It ran a second scoring
  // engine (ScoringService, now deleted) that returned 0-5 while the frontend
  // worked in 0-100, downgraded only Advanced without a signature, and had no
  // evidence check at all. Keeping two engines aligned by hand was the defect;
  // /result below is the single path.
  //
  // RESULTS — the only route that issues a badge.
  //
  // THIS ROUTE IS THE BADGE AUTHORITY. The client sends its computed score and
  // its LevelContext; the server re-derives the critical-control gate and the
  // evidence check from STORED ANSWERS, resolves the level itself, and only
  // then issues a badge. A client cannot mint a badge by asserting
  // hasSignature or hasEvidence over an empty answer table.
  router.post('/assessments/:assessmentId/result', async (req, res, next) => {
    try {
      const assessment = await assessmentService.getAssessment(req.params.assessmentId);
      if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

      // Validates the payload, re-derives gating/evidence from stored answers,
      // and resolves the level of record server-side.
      const result = await resultService.buildResult(req.params.assessmentId, req.body);

      await assessmentService.updateAssessmentMetrics(
        req.params.assessmentId,
        result.completion,
        result.overallScore,
        result.badgeTier,
        result.criticalGating.capped,
        result.selfCertified,
        result.selfCertifiedAt
      );

      // Issue the badge only if the SERVER-resolved level is badge-bearing and
      // the assessment is actually complete. Re-issuing for an assessment that
      // already has a live badge returns the existing one rather than minting
      // duplicates.
      let badge = null;
      if (result.badgeEligible && result.completion.percentage === 100) {
        // The badge belongs to the company, and an assessment reaches its
        // company through the user who started it.
        const owner = await userService.getUser(assessment.userId);
        const companyId = owner?.companyId;
        if (!companyId) return res.status(409).json({ error: 'Assessment has no owning company; cannot issue badge' });

        badge = await badgeService.getActiveBadge(req.params.assessmentId);
        if (!badge || badge.tier !== result.badgeTier) {
          badge = await badgeService.issueBadge(
            req.params.assessmentId,
            companyId,
            result.badgeTier,
            result.overallScore,
            req.body.frameworks || []
          );
          await auditLogRepository.create(new AuditLog({
            id: uuidv4(),
            companyId,
            userId: assessment.userId,
            assessmentId: req.params.assessmentId,
            action: 'BADGE_ISSUED',
            ipAddress: req.ip
          }));
        }
      }

      res.json({
        ...result,
        badge: badge
          ? {
              id: badge.id,
              tier: badge.tier,
              score: badge.score,
              verificationToken: badge.verificationToken,
              issuedAt: badge.issuedAt,
              expiresAt: badge.expiresAt,
              verifyUrl: `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`}/verify/${badge.verificationToken}`,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  });

  // BADGES (the certified entity is the company)
  //
  // HARDENED. This route used to take tier and overallScore straight from the
  // request body, which meant a caller could ask for a badge it had not earned:
  // an assessment with zero answers on the free tier could be issued "advanced"
  // at 100. With compute-score retired this was the last forgeable path, and it
  // undermined the one claim the product makes — that a badge is earned.
  //
  // The tier and score now come from what the SERVER resolved and stored on the
  // assessment via POST /result. Anything in the body is ignored.
  router.post('/assessments/:assessmentId/badges', async (req, res, next) => {
    try {
      const assessment = await assessmentService.getAssessment(req.params.assessmentId);
      if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

      // A result must have been computed and stored first. A fresh assessment
      // still carries its defaults (0% complete, score 0), so this is the
      // "you never submitted a result" case, distinct from "you scored badly".
      if (assessment.completionPercentage === 0 && Number(assessment.overallScore) === 0) {
        return res.status(409).json({
          error: 'No result recorded for this assessment. POST /assessments/:id/result first; that route resolves the level and issues the badge.',
        });
      }

      // Aware is not badge-bearing. This also catches every gate /result
      // applied — critical-control cap, missing evidence, free tier, unsigned
      // — because each of them resolves the stored tier down to aware.
      if (assessment.badgeTier === BADGE_TIERS.AWARE) {
        return res.status(409).json({
          error: 'Aware is not badge-bearing, so no badge can be issued for this assessment.',
          storedTier: assessment.badgeTier,
        });
      }

      if (assessment.completionPercentage !== 100) {
        return res.status(409).json({
          error: 'Assessment is not complete, so no badge can be issued.',
          completionPercentage: assessment.completionPercentage,
        });
      }

      // The badge belongs to the company, reached through the user who started
      // the assessment — not through a companyId supplied by the caller.
      const owner = await userService.getUser(assessment.userId);
      const companyId = owner?.companyId;
      if (!companyId) return res.status(409).json({ error: 'Assessment has no owning company; cannot issue badge' });

      // Surface a mismatch rather than silently discarding it: a body asking
      // for a different tier than the one stored is worth seeing in the log.
      if (req.body?.tier && req.body.tier !== assessment.badgeTier) {
        logger.warn(
          { assessmentId: assessment.id, requested: req.body.tier, stored: assessment.badgeTier },
          'Badge request asked for a tier the assessment did not earn; stored tier used'
        );
      }

      const existing = await badgeService.getActiveBadge(req.params.assessmentId);
      if (existing && existing.tier === assessment.badgeTier) {
        return res.status(200).json(existing);
      }

      const badge = await badgeService.issueBadge(
        req.params.assessmentId,
        companyId,
        assessment.badgeTier,
        assessment.overallScore,
        req.body?.frameworks || []
      );

      await auditLogRepository.create(new AuditLog({
        id: uuidv4(),
        companyId,
        userId: assessment.userId,
        assessmentId: req.params.assessmentId,
        action: 'BADGE_ISSUED',
        ipAddress: req.ip
      }));

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
