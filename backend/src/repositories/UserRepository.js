const BaseRepository = require('./BaseRepository');
const { User } = require('../domain/entities');

class UserRepository extends BaseRepository {
  constructor(db) {
    super(db, 'users');
  }

  async create(user) {
    const sql = `
      INSERT INTO users (id, company_id, email, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      user.id,
      user.companyId,
      user.email,
      user.role,
      user.createdAt,
      user.updatedAt
    ]);
    return user;
  }

  async update(user) {
    const sql = `
      UPDATE users
      SET role = ?, updated_at = ?
      WHERE id = ?
    `;
    await this.run(sql, [
      user.role,
      new Date(),
      user.id
    ]);
    return user;
  }

  async findByEmail(email) {
    const row = await this.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return row ? this._mapToEntity(row) : null;
  }

  async findByCompany(companyId) {
    const rows = await this.all(
      'SELECT * FROM users WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async findById(id) {
    const row = await super.findById(id);
    return row ? this._mapToEntity(row) : null;
  }

  _mapToEntity(row) {
    return new User({
      id: row.id,
      companyId: row.company_id,
      email: row.email,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

module.exports = UserRepository;
