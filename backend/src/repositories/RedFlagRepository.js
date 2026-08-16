const BaseRepository = require('./BaseRepository');
const { v4: uuid } = require('uuid');
class RedFlagRepository extends BaseRepository {
  constructor(db) { super(db, 'assessment_red_flags'); }
  controls(stage) { return this.all(`SELECT c.id,c.question_id,c.domain_id,c.guidance,t.minimum_score FROM critical_controls c JOIN critical_control_thresholds t ON t.control_id=c.id AND t.adoption_stage=? ORDER BY c.question_id`,[stage]); }
  byAssessment(id, failedOnly=false) { return this.all(`SELECT f.*,c.domain_id,c.guidance FROM assessment_red_flags f JOIN critical_controls c ON c.id=f.control_id WHERE f.assessment_id=?${failedOnly?' AND f.failed=1':''} ORDER BY f.question_id`,[id]); }
  async replaceInTransaction(assessment, result, domainScores, flags) {
    await this.run('BEGIN IMMEDIATE');
    try {
      await this.run(`UPDATE assessments SET status='finalized',completion_percentage=100,overall_score=?,result_level_id=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'`,[result.overallScore,result.level.tier,assessment.id]);
      await this.run('DELETE FROM domain_scores WHERE assessment_id=?',[assessment.id]);
      for (const d of domainScores) await this.run('INSERT INTO domain_scores(id,assessment_id,domain_name,score) VALUES(?,?,?,?)',[uuid(),assessment.id,d.id,d.pct]);
      for (const f of flags) await this.run('INSERT INTO assessment_red_flags(id,assessment_id,control_id,question_id,actual_score,threshold,failed) VALUES(?,?,?,?,?,?,?)',[uuid(),assessment.id,f.id,f.question_id,f.actualScore,f.minimum_score,f.failed?1:0]);
      await this.run('COMMIT');
    } catch(e) { await this.run('ROLLBACK'); throw e; }
  }
}
module.exports=RedFlagRepository;
