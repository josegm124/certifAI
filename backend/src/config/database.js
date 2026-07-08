const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const dbPath = path.join(__dirname, '../../db/certifai.db');

let db = null;

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error({ err }, 'Failed to open database');
        reject(err);
      } else {
        logger.info({ dbPath }, 'Database connected');
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) reject(err);
          else resolve(db);
        });
      }
    });
  });
};

const runSchema = async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        logger.error({ err }, 'Failed to run schema');
        reject(err);
      } else {
        logger.info('Schema initialized successfully');
        resolve();
      }
    });
  });
};

const getDb = () => db;

module.exports = {
  initializeDatabase,
  runSchema,
  getDb
};
