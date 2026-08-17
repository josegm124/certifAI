const { DOMAINS, QUESTION_IDS } = require('../domain/instrument');
const httpError = require('../utils/httpError');
const logger = require('../config/logger');

class AssessmentFinalizationService {
  constructor(assessmentService, assessmentRepository, answers, scoring, redFlags, redFlagRepository, eligibility, badges, catalog) {
    Object.assign(this, {
      assessmentService,
      assessments: assessmentRepository,
      answers,
      scoring,
      redFlags,
      redFlagRepository,
      eligibility,
      badges,
      catalog,
    });
  }

  async finalize(user, assessmentId) {
    const startedAt = Date.now();
    const assessment = await this.assessmentService.requireOwned(assessmentId, user.id);
    if (assessment.status === 'finalized') return this.result(assessment, user.companyId);

    const answers = await this.answers.findByAssessment(assessmentId);
    const ids = new Set(answers.map((answer) => Number(answer.questionId)));
    if (answers.length !== QUESTION_IDS.length || QUESTION_IDS.some((questionId) => !ids.has(questionId))) {
      throw httpError(409, `All ${QUESTION_IDS.length} canonical questions must be saved before finalization`, 'ASSESSMENT_INCOMPLETE');
    }
    if (assessment.remediationSourceAssessmentId) {
      const confirmations = await this.assessments.countDomainConfirmations(assessmentId);
      if (confirmations !== DOMAINS.length) {
        throw httpError(409, `All ${DOMAINS.length} remediation domains must be confirmed`, 'REMEDIATION_CONFIRMATIONS_INCOMPLETE');
      }
    }

    const result = this.scoring.calculate(answers);
    const flags = await this.redFlags.evaluate(assessment.adoptionStage, answers);
    await this.redFlagRepository.finalizeInTransaction(assessment, result, flags);
    const storedAssessment = await this.assessments.findById(assessmentId);

    logger.audit.info({
      event: 'assessment.finalized',
      assessmentId,
      userId: user.id,
      companyId: user.companyId,
      adoptionStage: assessment.adoptionStage,
      score: result.overallScore,
      level: result.level.tier,
      failedCriticalCount: flags.filter((flag) => flag.status === 'failed').length,
    });
    logger.metric.info({ event: 'assessment.finalize', assessmentId, durationMs: Date.now() - startedAt });
    return this.result(storedAssessment, user.companyId);
  }

  async result(assessment, companyId) {
    const [answers, flags, failedControls, badge, catalog] = await Promise.all([
      this.answers.findByAssessment(assessment.id),
      this.redFlagRepository.byAssessment(assessment.id),
      this.redFlags.failures(assessment.id),
      this.badges.getActiveBadge(assessment.id),
      this.catalog.getPublicCatalog(),
    ]);
    const analytics = this.scoring.analyze(answers);
    const level = this.scoring.levelForTier(assessment.resultLevelId);
    const result = {
      ...analytics,
      overallScore: Number(assessment.overallScore),
      level,
    };
    const certificateEligibility = this.eligibility.describe(
      assessment.resultLevelId,
      flags,
      catalog.products.map((product) => product.id),
    );
    return {
      assessment: await this.assessmentService.detail(assessment),
      result,
      adoptionStage: assessment.adoptionStage,
      certificateEligibility,
      eligibleProducts: certificateEligibility.eligibleProductIds,
      failedControls,
      badge,
      companyId,
    };
  }
}

module.exports = AssessmentFinalizationService;
