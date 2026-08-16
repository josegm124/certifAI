const BaseRepository = require('./BaseRepository');

const map = (row) => row && ({
  id: row.id, userId: row.user_id, aiSystemId: row.ai_system_id,
  adoptionStage: row.adoption_stage, status: row.status,
  completionPercentage: row.completion_percentage, overallScore: row.overall_score,
  resultLevelId: row.result_level_id, remediationOfAssessmentId: row.remediation_of_assessment_id,
  completedAt: row.completed_at ? new Date(row.completed_at) : null,
  createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
});

class AssessmentRepository extends BaseRepository {
  constructor(db) { super(db, 'assessments'); }
  async create(a) {
    await this.run(`INSERT INTO assessments (id,user_id,ai_system_id,adoption_stage,status,completion_percentage,overall_score,result_level_id,remediation_of_assessment_id,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [a.id,a.userId,a.aiSystemId,a.adoptionStage,a.status,a.completionPercentage,a.overallScore,a.resultLevelId,a.remediationOfAssessmentId,a.completedAt,a.createdAt,a.updatedAt]); return a;
  }
  async update(a) { await this.run(`UPDATE assessments SET status=?,completion_percentage=?,overall_score=?,result_level_id=?,completed_at=?,updated_at=? WHERE id=?`, [a.status,a.completionPercentage,a.overallScore,a.resultLevelId,a.completedAt,new Date(),a.id]); return a; }
  async findById(id) { return map(await super.findById(id)); }
  async findByUser(userId) { return (await this.all('SELECT * FROM assessments WHERE user_id=? ORDER BY created_at DESC',[userId])).map(map); }
  async findActiveByUser(userId) { return map(await this.get("SELECT * FROM assessments WHERE user_id=? AND status='draft' LIMIT 1",[userId])); }
}
module.exports = AssessmentRepository;
