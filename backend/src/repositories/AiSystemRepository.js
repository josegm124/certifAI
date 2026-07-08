const BaseRepository = require('./BaseRepository');
const { AiSystem } = require('../domain/entities');

class AiSystemRepository extends BaseRepository {
  constructor(db) {
    super(db, 'ai_systems');
  }

  async create(system) {
    const sql = `
      INSERT INTO ai_systems (id, organization_id, name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      system.id,
      system.organizationId,
      system.name,
      system.description,
      system.createdAt
    ]);
    return system;
  }

  async findByOrg(orgId) {
    const rows = await this.all(
      'SELECT * FROM ai_systems WHERE organization_id = ? ORDER BY created_at DESC',
      [orgId]
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
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at)
    });
  }
}

module.exports = AiSystemRepository;
