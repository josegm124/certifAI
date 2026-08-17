const BaseRepository = require('./BaseRepository');

const map = (row) => row && ({
  id: row.id,
  dossierId: row.dossier_id,
  productId: row.product_id,
  assessmentId: row.assessment_id,
  companyId: row.company_id,
  tier: row.tier,
  score: Number(row.score),
  issuedAt: new Date(row.issued_at),
  expiresAt: new Date(row.expires_at),
  verificationToken: row.verification_token,
  frameworksIncluded: JSON.parse(row.frameworks_included || '[]'),
  isExpired() { return new Date() > this.expiresAt; },
});

class BadgeRepository extends BaseRepository {
  constructor(db) {
    super(db, 'badges');
  }

  async create(badge) {
    await this.run(`
      INSERT INTO badges
        (id, dossier_id, product_id, assessment_id, company_id, tier, score, issued_at, expires_at, verification_token, frameworks_included)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      badge.id,
      badge.dossierId,
      badge.productId,
      badge.assessmentId,
      badge.companyId,
      badge.tier,
      badge.score,
      badge.issuedAt,
      badge.expiresAt,
      badge.verificationToken,
      JSON.stringify(badge.frameworksIncluded),
    ]);
    return badge;
  }

  async findByAssessment(assessmentId) {
    return map(await this.get('SELECT * FROM badges WHERE assessment_id = ?', [assessmentId]));
  }

  async findByToken(token) {
    return map(await this.get('SELECT * FROM badges WHERE verification_token = ?', [token]));
  }

  async findRenewingSoon(daysThreshold = 60) {
    return (await this.all(`
      SELECT * FROM badges
      WHERE expires_at > datetime('now')
        AND expires_at <= datetime('now', '+' || ? || ' days')
      ORDER BY expires_at
    `, [daysThreshold])).map(map);
  }
}

module.exports = BadgeRepository;
