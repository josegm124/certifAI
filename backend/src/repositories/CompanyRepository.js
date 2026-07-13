const BaseRepository = require('./BaseRepository');
const { Company } = require('../domain/entities');

class CompanyRepository extends BaseRepository {
  constructor(db) {
    super(db, 'companies');
  }

  async create(company) {
    const sql = `
      INSERT INTO companies (id, name, tier, subscription_id, subscription_expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      company.id,
      company.name,
      company.tier,
      company.subscriptionId,
      company.subscriptionExpiresAt,
      company.createdAt,
      company.updatedAt
    ]);
    return company;
  }

  async update(company) {
    const sql = `
      UPDATE companies
      SET name = ?, tier = ?, subscription_id = ?, subscription_expires_at = ?, updated_at = ?
      WHERE id = ?
    `;
    await this.run(sql, [
      company.name,
      company.tier,
      company.subscriptionId,
      company.subscriptionExpiresAt,
      new Date(),
      company.id
    ]);
    return company;
  }

  // Case-insensitive on name (companies.name COLLATE NOCASE) so "Microsoft" and
  // "microsoft" resolve to the same company row.
  async findByName(name) {
    const row = await this.get(
      'SELECT * FROM companies WHERE name = ?',
      [name]
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
    return new Company({
      id: row.id,
      name: row.name,
      tier: row.tier,
      subscriptionId: row.subscription_id,
      subscriptionExpiresAt: row.subscription_expires_at,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

module.exports = CompanyRepository;
