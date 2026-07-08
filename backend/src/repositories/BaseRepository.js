const logger = require('../config/logger');

class BaseRepository {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error({ err, sql, params }, 'Database error');
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error({ err, sql, params }, 'Database get error');
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error({ err, sql, params }, 'Database all error');
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async findById(id) {
    return this.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  async findAll() {
    return this.all(`SELECT * FROM ${this.tableName}`);
  }

  async delete(id) {
    return this.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}

module.exports = BaseRepository;
