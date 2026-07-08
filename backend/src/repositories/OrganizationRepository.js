const BaseRepository = require('./BaseRepository');
const { Organization } = require('../domain/entities');

class OrganizationRepository extends BaseRepository {
  constructor(db) {
    super(db, 'organizations');
  }

  async create(org) {
    const sql = `
      INSERT INTO organizations (id, name, email, tier, subscription_id, subscription_expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      org.id,
      org.name,
      org.email,
      org.tier,
      org.subscriptionId,
      org.subscriptionExpiresAt,
      org.createdAt,
      org.updatedAt
    ]);
    return org;
  }

  async update(org) {
    const sql = `
      UPDATE organizations
      SET name = ?, tier = ?, subscription_id = ?, subscription_expires_at = ?, updated_at = ?
      WHERE id = ?
    `;
    await this.run(sql, [
      org.name,
      org.tier,
      org.subscriptionId,
      org.subscriptionExpiresAt,
      new Date(),
      org.id
    ]);
    return org;
  }

  async findByEmail(email) {
    const row = await this.get(
      'SELECT * FROM organizations WHERE email = ?',
      [email]
    );
    return row ? this._mapToEntity(row) : null;
  }

  async findById(id) {
    const row = await super.findById(id);
    return row ? this._mapToEntity(row) : null;
  }

  async findAll() {
    const rows = await super.findAll();
    return rows.map(row => this._mapToEntity(row));
  }

  _mapToEntity(row) {
    return new Organization({
      id: row.id,
      name: row.name,
      email: row.email,
      tier: row.tier,
      subscriptionId: row.subscription_id,
      subscriptionExpiresAt: row.subscription_expires_at,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

module.exports = OrganizationRepository;
