const BaseRepository = require('./BaseRepository');
const { AuditLog } = require('../domain/entities');

class AuditLogRepository extends BaseRepository {
  constructor(db) {
    super(db, 'audit_logs');
  }

  async create(auditLog) {
    const sql = `
      INSERT INTO audit_logs (id, company_id, user_id, assessment_id, action, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      auditLog.id,
      auditLog.companyId,
      auditLog.userId,
      auditLog.assessmentId,
      auditLog.action,
      auditLog.details ? JSON.stringify(auditLog.details) : null,
      auditLog.ipAddress,
      auditLog.createdAt
    ]);
    return auditLog;
  }

  async findByCompany(companyId, limit = 100) {
    const rows = await this.all(
      'SELECT * FROM audit_logs WHERE company_id = ? ORDER BY created_at DESC LIMIT ?',
      [companyId, limit]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findByUser(userId, limit = 100) {
    const rows = await this.all(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findByAssessment(assessmentId, limit = 50) {
    const rows = await this.all(
      'SELECT * FROM audit_logs WHERE assessment_id = ? ORDER BY created_at DESC LIMIT ?',
      [assessmentId, limit]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  _mapToEntity(row) {
    return new AuditLog({
      id: row.id,
      companyId: row.company_id,
      userId: row.user_id,
      assessmentId: row.assessment_id,
      action: row.action,
      details: row.details ? JSON.parse(row.details) : null,
      ipAddress: row.ip_address,
      createdAt: new Date(row.created_at)
    });
  }
}

module.exports = AuditLogRepository;
