const { Assessment, AiSystem, AssessmentAnswer } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class AssessmentService {
  constructor(assessmentRepository, answerRepository, aiSystemRepository, auditLogRepository) {
    this.assessmentRepository = assessmentRepository;
    this.answerRepository = answerRepository;
    this.aiSystemRepository = aiSystemRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async createAssessment(userId, companyId, aiSystemId, tier) {
    try {
      // Get or create AI System (company-owned asset)
      let system = await this.aiSystemRepository.findById(aiSystemId);
      if (!system) {
        system = new AiSystem({
          id: aiSystemId,
          companyId,
          name: aiSystemId  // Use aiSystemId as name to ensure uniqueness
        });
        // create() now handles duplicates gracefully
        system = await this.aiSystemRepository.create(system);
      }

      const assessment = new Assessment({
        id: uuidv4(),
        userId,
        aiSystemId,
        tier
      });

      await this.assessmentRepository.create(assessment);
      logger.info({ assessmentId: assessment.id, tier, userId, systemId: aiSystemId }, 'Assessment created');
      return assessment;
    } catch (err) {
      logger.error({ err, userId, companyId, aiSystemId, tier }, 'Failed to create assessment');
      throw err;
    }
  }

  async getAssessment(assessmentId) {
    return this.assessmentRepository.findById(assessmentId);
  }

  async getAssessmentsForUser(userId) {
    return this.assessmentRepository.findByUser(userId);
  }

  async recordAnswer(assessmentId, questionId, score, evidence = '', attestation = '') {
    let answer = await this.answerRepository.findByAssessmentAndQuestion(assessmentId, questionId);

    if (!answer) {
      answer = new AssessmentAnswer({
        id: uuidv4(),
        assessmentId,
        questionId,
        score,
        evidence,
        attestation
      });
      await this.answerRepository.create(answer);
      logger.debug({ assessmentId, questionId, score }, 'Answer created');
    } else {
      answer.score = score;
      answer.evidence = evidence;
      answer.attestation = attestation;
      answer.updatedAt = new Date();
      await this.answerRepository.create(answer);
      logger.debug({ assessmentId, questionId, score }, 'Answer updated');
    }

    return answer;
  }

  async updateAssessmentMetrics(assessmentId, completion, overallScore, badgeTier, criticalGating) {
    const assessment = await this.assessmentRepository.findById(assessmentId);
    assessment.completionPercentage = completion.percentage;
    assessment.overallScore = overallScore;
    assessment.badgeTier = badgeTier;
    assessment.criticalGatingActive = criticalGating;

    if (completion.percentage === 100) {
      assessment.completedAt = new Date();
    }

    await this.assessmentRepository.update(assessment);
    logger.info(
      { assessmentId, completion: completion.percentage, score: overallScore },
      'Assessment metrics updated'
    );

    return assessment;
  }

  async exportAssessment(assessmentId) {
    const assessment = await this.assessmentRepository.findById(assessmentId);
    const answers = await this.answerRepository.findByAssessment(assessmentId);

    return {
      assessment: {
        id: assessment.id,
        userId: assessment.userId,
        aiSystemId: assessment.aiSystemId,
        completion: assessment.completionPercentage,
        overallScore: assessment.overallScore,
        badgeTier: assessment.badgeTier,
        completedAt: assessment.completedAt
      },
      answers: answers.reduce((acc, a) => {
        acc[a.questionId] = {
          score: a.score,
          evidence: a.evidence,
          attestation: a.attestation
        };
        return acc;
      }, {}),
      exportedAt: new Date()
    };
  }

  async importAssessment(userId, data) {
    const assessment = new Assessment({
      id: data.assessment.id || uuidv4(),
      userId,
      aiSystemId: data.assessment.aiSystemId,
      completionPercentage: data.assessment.completion || 0,
      overallScore: data.assessment.overallScore || 0,
      badgeTier: data.assessment.badgeTier || 'aware'
    });

    await this.assessmentRepository.create(assessment);

    for (const [questionId, answerData] of Object.entries(data.answers || {})) {
      const answer = new AssessmentAnswer({
        id: uuidv4(),
        assessmentId: assessment.id,
        questionId,
        score: answerData.score,
        evidence: answerData.evidence || '',
        attestation: answerData.attestation || ''
      });
      await this.answerRepository.create(answer);
    }

    logger.info({ assessmentId: assessment.id }, 'Assessment imported');
    return assessment;
  }
}

module.exports = AssessmentService;
