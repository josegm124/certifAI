const { QUESTION_IDS, FRAMEWORKS } = require('../domain/instrument');
const httpError = require('../utils/httpError');
const logger = require('../config/logger');

class AssessmentFinalizationService {
  constructor(assessmentService, assessmentRepository, answerRepository, scoringService, badgeService) {
    this.assessmentService = assessmentService;
    this.assessments = assessmentRepository;
    this.answers = answerRepository;
    this.scoring = scoringService;
    this.badges = badgeService;
  }

  async finalize(user, assessmentId, input = {}) {
    const startedAt = Date.now();
    const assessment = await this.assessmentService.requireOwned(assessmentId, user.id);
    if (assessment.status === 'finalized') {
      const stored = await this.result(assessment, user.companyId);
      // If the DB write succeeded but badge issuance failed, a safe retry of
      // finalize completes the missing side effect instead of duplicating it.
      if (!stored.badge && assessment.tier === 2 && stored.result.level.badge) {
        stored.badge = await this.badges.issueBadge(
          assessment.id, user.companyId, stored.result.level.tier,
          stored.result.overallScore, FRAMEWORKS
        );
      }
      return stored;
    }
    const answers = await this.answers.findByAssessment(assessmentId);
    const ids = new Set(answers.map((answer) => Number(answer.questionId)));
    if (answers.length !== QUESTION_IDS.length || QUESTION_IDS.some((id) => !ids.has(id))) {
      throw httpError(409, 'All 36 canonical questions must be saved before finalization', 'ASSESSMENT_INCOMPLETE');
    }
    let signatoryName = null;
    if (assessment.tier === 2) {
      signatoryName = String(input.signatoryName || '').trim().replace(/\s+/g, ' ');
      if (!signatoryName || input.acceptedDeclaration !== true) {
        throw httpError(400, 'Tier 2 requires the signatory name and accepted declaration', 'SIGNATURE_REQUIRED');
      }
    }
    const result = this.scoring.calculate(answers, assessment.tier, Boolean(signatoryName));
    assessment.status = 'finalized';
    assessment.completionPercentage = 100;
    assessment.overallScore = result.overallScore;
    assessment.badgeTier = result.level.tier;
    assessment.criticalGatingActive = result.criticalGating.capped;
    assessment.signatoryName = signatoryName;
    assessment.selfCertifiedAt = signatoryName ? new Date() : null;
    assessment.completedAt = new Date();
    await this.assessments.update(assessment);
    let badge = null;
    if (assessment.tier === 2 && result.level.badge) {
      badge = await this.badges.issueBadge(assessment.id, user.companyId, result.level.tier, result.overallScore, FRAMEWORKS);
    }
    logger.audit.info({ event: 'assessment.finalized', assessmentId: assessment.id, userId: user.id, companyId: user.companyId, tier: assessment.tier, score: result.overallScore, level: result.level.id, badgeId: badge?.id || null });
    logger.metric.info({ event: 'assessment.finalize', assessmentId: assessment.id, durationMs: Date.now() - startedAt, badgeIssued: Boolean(badge) });
    return { assessment: await this.assessmentService.detail(assessment), result, badge };
  }

  async result(assessment, companyId) {
    const answers = await this.answers.findByAssessment(assessment.id);
    const result = this.scoring.calculate(answers, assessment.tier, Boolean(assessment.signatoryName));
    const badge = await this.badges.getActiveBadge(assessment.id);
    return { assessment: await this.assessmentService.detail(assessment), result, badge, companyId };
  }
}

module.exports = AssessmentFinalizationService;
