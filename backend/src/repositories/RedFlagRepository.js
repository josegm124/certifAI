const BaseRepository = require('./BaseRepository');
const { v4: uuid } = require('uuid');

class RedFlagRepository extends BaseRepository {
  constructor(db) {
    super(db, 'assessment_critical_flags');
  }

  controls(adoptionStage) {
    return this.all(`
      SELECT
        control.question_id,
        control.domain_id,
        control.guidance_text,
        threshold.threshold_required
      FROM critical_controls control
      JOIN critical_control_thresholds threshold
        ON threshold.question_id = control.question_id
       AND threshold.adoption_stage = ?
      WHERE control.active = 1
      ORDER BY control.question_id
    `, [adoptionStage]);
  }

  byAssessment(assessmentId, failedOnly = false) {
    return this.all(`
      SELECT
        flag.assessment_id,
        flag.question_id,
        flag.score_given,
        flag.threshold_required,
        flag.status,
        flag.created_at,
        control.domain_id,
        control.guidance_text
      FROM assessment_critical_flags flag
      JOIN critical_controls control ON control.question_id = flag.question_id
      WHERE flag.assessment_id = ?
      ${failedOnly ? "AND flag.status = 'failed'" : ''}
      ORDER BY flag.question_id
    `, [assessmentId]);
  }

  async finalizeInTransaction(assessment, result, flags) {
    await this.run('BEGIN IMMEDIATE');
    try {
      const updated = await this.run(`
        UPDATE assessments
        SET status = 'finalized',
            completion_percentage = 100,
            overall_score = ?,
            result_level_id = ?,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'draft'
      `, [result.overallScore, result.level.tier, assessment.id]);
      if (updated.changes !== 1) throw new Error('ASSESSMENT_FINALIZATION_CONFLICT');

      for (const domain of result.domainScores) {
        await this.run(`
          INSERT INTO domain_scores
            (id, assessment_id, domain_name, score, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [uuid(), assessment.id, domain.id, domain.pct]);
      }

      for (const flag of flags) {
        await this.run(`
          INSERT INTO assessment_critical_flags
            (assessment_id, question_id, score_given, threshold_required, status)
          VALUES (?, ?, ?, ?, ?)
        `, [
          assessment.id,
          flag.questionId,
          flag.scoreGiven,
          flag.thresholdRequired,
          flag.status,
        ]);
      }
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }
}

module.exports = RedFlagRepository;
