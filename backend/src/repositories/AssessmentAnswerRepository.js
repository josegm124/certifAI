const BaseRepository = require('./BaseRepository');
const { AssessmentAnswer } = require('../domain/entities');

class AssessmentAnswerRepository extends BaseRepository {
  constructor(db) {
    super(db, 'assessment_answers');
  }

  async create(answer) {
    const sql = `
      INSERT INTO assessment_answers
      (id, assessment_id, question_id, score, evidence, attestation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(assessment_id, question_id) DO UPDATE SET
        score = excluded.score,
        evidence = excluded.evidence,
        attestation = excluded.attestation,
        updated_at = excluded.updated_at
    `;
    await this.run(sql, [
      answer.id,
      answer.assessmentId,
      answer.questionId,
      answer.score,
      answer.evidence,
      answer.attestation,
      answer.createdAt,
      answer.updatedAt
    ]);
    return answer;
  }

  async upsertMany(answers) {
    await this.run('BEGIN IMMEDIATE');
    try {
      for (const answer of answers) await this.create(answer);
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
    return answers;
  }

  async upsertManyWithConfirmation(answers, assessmentId, domainId, confirmed) {
    await this.run('BEGIN IMMEDIATE');
    try {
      for (const answer of answers) await this.create(answer);
      await this.run('DELETE FROM remediation_confirmations WHERE assessment_id=? AND domain_id=?', [assessmentId, domainId]);
      if (confirmed) await this.run(`INSERT INTO remediation_confirmations(assessment_id,domain_id,confirmed,confirmed_at) VALUES(?,?,1,CURRENT_TIMESTAMP)`, [assessmentId, domainId]);
      await this.run('COMMIT');
    } catch (error) { await this.run('ROLLBACK'); throw error; }
    return answers;
  }

  async findByAssessment(assessmentId) {
    const rows = await this.all(
      'SELECT * FROM assessment_answers WHERE assessment_id = ?',
      [assessmentId]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findByAssessmentAndQuestion(assessmentId, questionId) {
    const row = await this.get(
      'SELECT * FROM assessment_answers WHERE assessment_id = ? AND question_id = ?',
      [assessmentId, questionId]
    );
    return row ? this._mapToEntity(row) : null;
  }

  async countAnswered(assessmentId) {
    const result = await this.get(
      'SELECT COUNT(*) as count FROM assessment_answers WHERE assessment_id = ? AND score IS NOT NULL',
      [assessmentId]
    );
    return result?.count || 0;
  }

  _mapToEntity(row) {
    return new AssessmentAnswer({
      id: row.id,
      assessmentId: row.assessment_id,
      questionId: row.question_id,
      score: row.score,
      evidence: row.evidence,
      attestation: row.attestation,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

module.exports = AssessmentAnswerRepository;
