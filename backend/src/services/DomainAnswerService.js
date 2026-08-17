const { AssessmentAnswer } = require('../domain/entities');
const { DOMAINS, QUESTION_IDS } = require('../domain/instrument');
const { v4: uuidv4 } = require('uuid');
const httpError = require('../utils/httpError');
const logger = require('../config/logger');

class DomainAnswerService {
  constructor(assessmentService, answerRepository, assessmentRepository) {
    this.assessmentService = assessmentService;
    this.answers = answerRepository;
    this.assessments = assessmentRepository;
  }

  async save(userId, assessmentId, domainId, payload) {
    const startedAt = Date.now();
    const assessment = await this.assessmentService.requireOwned(assessmentId, userId, false);
    const domain = DOMAINS.find((item) => item.id === domainId);
    if (!domain) throw httpError(404, 'Unknown assessment domain', 'DOMAIN_NOT_FOUND');
    if (!Array.isArray(payload.answers)) throw httpError(400, 'answers must be an array', 'INVALID_ANSWERS');
    const seen = new Set();
    const rows = payload.answers.map((input) => {
      const questionId = Number(input.questionId);
      const score = Number(input.score);
      if (!Number.isInteger(questionId) || !QUESTION_IDS.includes(questionId) || !domain.questionIds.includes(questionId) || seen.has(questionId)) {
        throw httpError(400, `Question ${input.questionId} does not belong to ${domainId}`, 'INVALID_QUESTION');
      }
      if (!Number.isInteger(score) || score < 0 || score > 5) throw httpError(400, `Question ${questionId} score must be 0 to 5`, 'INVALID_SCORE');
      seen.add(questionId);
      return new AssessmentAnswer({
        id: uuidv4(), assessmentId, questionId, score,
        evidence: assessment.remediationSourceAssessmentId ? String(input.evidence || '').trim() : '',
        attestation: assessment.remediationSourceAssessmentId ? String(input.attestation || '').trim() : '',
      });
    });
    if (seen.size !== domain.questionIds.length || domain.questionIds.some((id) => !seen.has(id))) {
      throw httpError(400, `All ${domain.questionIds.length} questions in ${domainId} are required`, 'INCOMPLETE_DOMAIN');
    }
    if (assessment.remediationSourceAssessmentId) {
      await this.answers.upsertManyWithConfirmation(rows, assessmentId, domainId, payload.confirmed === true);
    } else {
      await this.answers.upsertMany(rows);
    }
    const count = await this.answers.countAnswered(assessmentId);
    assessment.completionPercentage = Math.round((count / QUESTION_IDS.length) * 100);
    await this.assessments.update(assessment);
    logger.audit.info({ event: 'assessment.domain_saved', assessmentId, userId, domainId, answerCount: rows.length, completionPercentage: assessment.completionPercentage });
    logger.metric.info({ event: 'assessment.domain_save', assessmentId, domainId, answerCount: rows.length, durationMs: Date.now() - startedAt });
    return { assessmentId, domainId, saved: rows.length, answered: count, total: QUESTION_IDS.length, completionPercentage: assessment.completionPercentage };
  }
}

module.exports = DomainAnswerService;
