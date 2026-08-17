const { AiSystem } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const httpError = require('../utils/httpError');
const logger = require('../config/logger');
const { PROVISIONAL_ADOPTION_STAGE } = require('../domain/instrument');

class AssessmentService {
  constructor(assessmentRepository, answerRepository, aiSystemRepository) {
    this.assessments = assessmentRepository;
    this.answers = answerRepository;
    this.systems = aiSystemRepository;
  }

  async create(user, input) {
    if (Number(input.tier) === 2) throw httpError(400, 'Tier 2 is now the evidence dossier workflow', 'TIER_2_IS_DOSSIER_WORKFLOW');
    const active = await this.assessments.findActiveByUser(user.id);
    if (active) {
      logger.audit.info({ event: 'assessment.resumed', assessmentId: active.id, userId: user.id, companyId: user.companyId });
      return this.detail(active);
    }
    const name = String(input.aiSystemName || '').trim().replace(/\s+/g, ' ');
    if (!name) throw httpError(400, 'AI system name is required', 'INVALID_ASSESSMENT');
    let system = await this.systems.findByCompanyAndName(user.companyId, name);
    if (!system) system = await this.systems.create(new AiSystem({ id: uuidv4(), companyId: user.companyId, name }));
    const assessment = { id: uuidv4(), userId: user.id, aiSystemId: system.id, adoptionStage: PROVISIONAL_ADOPTION_STAGE, status: 'draft', completionPercentage: 0, overallScore: null, resultLevelId: null, remediationSourceAssessmentId: null, completedAt: null, createdAt: new Date(), updatedAt: new Date() };
    await this.assessments.create(assessment);
    logger.audit.info({ event: 'assessment.created', assessmentId: assessment.id, userId: user.id, companyId: user.companyId, adoptionStage: PROVISIONAL_ADOPTION_STAGE, aiSystemId: system.id });
    return this.detail(assessment);
  }

  async requireOwned(id, userId, allowFinalized = true) {
    const assessment = await this.assessments.findById(id);
    if (!assessment || assessment.userId !== userId) throw httpError(404, 'Assessment not found', 'ASSESSMENT_NOT_FOUND');
    if (!allowFinalized && assessment.status !== 'draft') throw httpError(409, 'Assessment is already finalized', 'ASSESSMENT_FINALIZED');
    return assessment;
  }

  async detail(assessment) {
    const [system, answers] = await Promise.all([
      this.systems.findById(assessment.aiSystemId),
      this.answers.findByAssessment(assessment.id),
    ]);
    return {
      id: assessment.id, adoptionStage: assessment.adoptionStage, status: assessment.status,
      completionPercentage: assessment.completionPercentage,
      overallScore: assessment.overallScore, resultLevelId: assessment.resultLevelId,
      remediationSourceAssessmentId: assessment.remediationSourceAssessmentId,
      completedAt: assessment.completedAt, createdAt: assessment.createdAt,
      aiSystem: { id: system.id, name: system.name },
      domainConfirmations: assessment.remediationSourceAssessmentId
        ? await this.assessments.findDomainConfirmations(assessment.id)
        : [],
      answers: Object.fromEntries(answers.map((answer) => [answer.questionId, {
        score: answer.score, evidence: answer.evidence, attestation: answer.attestation,
      }])),
    };
  }

  async active(userId) {
    const assessment = await this.assessments.findActiveByUser(userId);
    return assessment ? this.detail(assessment) : null;
  }

  async list(userId) {
    const items = await this.assessments.findByUser(userId);
    return Promise.all(items.map((item) => this.detail(item)));
  }
}

module.exports = AssessmentService;
module.exports.ADOPTION_STAGE = PROVISIONAL_ADOPTION_STAGE;
