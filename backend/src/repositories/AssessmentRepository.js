const BaseRepository = require('./BaseRepository');
const { Assessment } = require('../domain/entities');

class AssessmentRepository extends BaseRepository {
  constructor(db) {
    super(db, 'assessments');
  }

  async create(assessment) {
    const sql = `
      INSERT INTO assessments
      (id, organization_id, ai_system_id, tier, completion_percentage, overall_score, badge_tier, critical_gating_active, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      assessment.id,
      assessment.organizationId,
      assessment.aiSystemId,
      assessment.tier,
      assessment.completionPercentage,
      assessment.overallScore,
      assessment.badgeTier,
      assessment.criticalGatingActive ? 1 : 0,
      assessment.completedAt,
      assessment.createdAt,
      assessment.updatedAt
    ]);
    return assessment;
  }

  async update(assessment) {
    const sql = `
      UPDATE assessments
      SET completion_percentage = ?, overall_score = ?, badge_tier = ?, critical_gating_active = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `;
    await this.run(sql, [
      assessment.completionPercentage,
      assessment.overallScore,
      assessment.badgeTier,
      assessment.criticalGatingActive ? 1 : 0,
      assessment.completedAt,
      new Date(),
      assessment.id
    ]);
    return assessment;
  }

  async findByOrgAndSystem(orgId, systemId) {
    const row = await this.get(
      'SELECT * FROM assessments WHERE organization_id = ? AND ai_system_id = ? ORDER BY created_at DESC LIMIT 1',
      [orgId, systemId]
    );
    return row ? this._mapToEntity(row) : null;
  }

  async findByOrg(orgId) {
    const rows = await this.all(
      'SELECT * FROM assessments WHERE organization_id = ? ORDER BY created_at DESC',
      [orgId]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findById(id) {
    const row = await super.findById(id);
    return row ? this._mapToEntity(row) : null;
  }

  _mapToEntity(row) {
    return new Assessment({
      id: row.id,
      organizationId: row.organization_id,
      aiSystemId: row.ai_system_id,
      tier: row.tier,
      completionPercentage: row.completion_percentage,
      overallScore: row.overall_score,
      badgeTier: row.badge_tier,
      criticalGatingActive: row.critical_gating_active === 1,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

module.exports = AssessmentRepository;
