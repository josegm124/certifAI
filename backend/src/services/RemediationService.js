const { v4: uuid } = require('uuid');
const httpError = require('../utils/httpError');
const { PROVISIONAL_ADOPTION_STAGE } = require('../domain/instrument');
const logger = require('../config/logger');

class RemediationService {
  constructor(db, assessmentService, assessments) {
    Object.assign(this, { db, assessmentService, assessments });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => this.db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    }));
  }

  async create(user, sourceAssessmentId) {
    const source = await this.assessmentService.requireOwned(sourceAssessmentId, user.id);
    if (source.status !== 'finalized') {
      throw httpError(409, 'Source assessment is not finalized', 'ASSESSMENT_NOT_FINALIZED');
    }
    const active = await this.assessments.findActiveByUser(user.id);
    if (active) {
      if (active.remediationSourceAssessmentId === sourceAssessmentId) {
        return this.assessmentService.detail(active);
      }
      throw httpError(409, 'Another draft assessment exists', 'ACTIVE_ASSESSMENT_EXISTS');
    }

    const assessmentId = uuid();
    await this.run('BEGIN IMMEDIATE');
    try {
      await this.run(`
        INSERT INTO assessments
          (id, user_id, ai_system_id, adoption_stage, status, completion_percentage, remediation_source_assessment_id)
        VALUES (?, ?, ?, ?, 'draft', 100, ?)
      `, [assessmentId, user.id, source.aiSystemId, PROVISIONAL_ADOPTION_STAGE, source.id]);

      await this.run(`
        INSERT INTO assessment_answers
          (id, assessment_id, question_id, score, evidence, attestation)
        SELECT
          lower(hex(randomblob(16))),
          ?,
          source.question_id,
          source.score,
          CASE
            WHEN EXISTS (SELECT 1 FROM critical_controls control WHERE control.question_id = source.question_id)
            THEN COALESCE((
              SELECT item.written_reference
              FROM evidence_dossiers dossier
              JOIN evidence_items item ON item.dossier_id = dossier.id
              WHERE dossier.assessment_id = source.assessment_id
                AND item.question_id = source.question_id
              LIMIT 1
            ), source.evidence, '')
            ELSE source.evidence
          END,
          source.attestation
        FROM assessment_answers source
        WHERE source.assessment_id = ?
      `, [assessmentId, source.id]);
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }

    logger.audit.info({
      event: 'assessment.remediation_created',
      assessmentId,
      sourceAssessmentId,
      userId: user.id,
      companyId: user.companyId,
      adoptionStage: PROVISIONAL_ADOPTION_STAGE,
    });
    return this.assessmentService.detail(await this.assessments.findById(assessmentId));
  }
}

module.exports = RemediationService;
