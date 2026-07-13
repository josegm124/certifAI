const BaseRepository = require('./BaseRepository');
const { AiSystem } = require('../domain/entities');

class AiSystemRepository extends BaseRepository {
  constructor(db) {
    super(db, 'ai_systems');
  }

  async create(system) {
    // Check if system already exists (prevents duplicate key errors)
    const existing = await this.findById(system.id);
    if (existing) {
      return existing;
    }

    // Also check by company + name to avoid UNIQUE constraint
    const byName = await this.get(
      'SELECT * FROM ai_systems WHERE company_id = ? AND name = ?',
      [system.companyId, system.name]
    );
    if (byName) {
      return this._mapToEntity(byName);
    }

    const sql = `
      INSERT INTO ai_systems (id, company_id, name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      system.id,
      system.companyId,
      system.name,
      system.description,
      system.createdAt
    ]);
    return system;
  }

  async findByCompany(companyId) {
    const rows = await this.all(
      'SELECT * FROM ai_systems WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findById(id) {
    const row = await super.findById(id);
    return row ? this._mapToEntity(row) : null;
  }

  _mapToEntity(row) {
    return new AiSystem({
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at)
    });
  }
}

module.exports = AiSystemRepository;
