const BaseRepository = require('./BaseRepository');
const { Badge } = require('../domain/entities');

class BadgeRepository extends BaseRepository {
  constructor(db) {
    super(db, 'badges');
  }

  async create(badge) {
    const sql = `
      INSERT INTO badges
      (id, assessment_id, company_id, tier, score, issued_at, expires_at, verification_token, frameworks_included)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      badge.id,
      badge.assessmentId,
      badge.companyId,
      badge.tier,
      badge.score,
      badge.issuedAt,
      badge.expiresAt,
      badge.verificationToken,
      JSON.stringify(badge.frameworksIncluded)
    ]);
    return badge;
  }

  async findByAssessment(assessmentId) {
    const row = await this.get(
      'SELECT * FROM badges WHERE assessment_id = ?',
      [assessmentId]
    );
    return row ? this._mapToEntity(row) : null;
  }

  async findByCompany(companyId) {
    const rows = await this.all(
      'SELECT * FROM badges WHERE company_id = ? ORDER BY issued_at DESC',
      [companyId]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findByToken(token) {
    const row = await this.get(
      'SELECT * FROM badges WHERE verification_token = ?',
      [token]
    );
    return row ? this._mapToEntity(row) : null;
  }

  async findRenewingSoon(daysThreshold = 60) {
    const sql = `
      SELECT * FROM badges
      WHERE expires_at > datetime('now')
      AND expires_at <= datetime('now', '+' || ? || ' days')
      ORDER BY expires_at ASC
    `;
    const rows = await this.all(sql, [daysThreshold]);
    return rows.map(row => this._mapToEntity(row));
  }

  _mapToEntity(row) {
    return new Badge({
      id: row.id,
      assessmentId: row.assessment_id,
      companyId: row.company_id,
      tier: row.tier,
      score: row.score,
      issuedAt: new Date(row.issued_at),
      expiresAt: new Date(row.expires_at),
      verificationToken: row.verification_token,
      frameworksIncluded: JSON.parse(row.frameworks_included || '[]')
    });
  }
}

module.exports = BadgeRepository;
