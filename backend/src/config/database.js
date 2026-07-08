const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const dbPath = path.join(__dirname, '../../db/certifai.db');
const uploadsDir = path.join(__dirname, '../../uploads');
const isDev = process.env.NODE_ENV === 'development';
const resetOnStart = process.env.RESET_DB_ON_START !== 'false'; // Default: true in dev

let db = null;

// Clean up uploads directory
const cleanUploads = () => {
  if (!fs.existsSync(uploadsDir)) return;
  try {
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(uploadsDir, file));
    });
    logger.info('Uploads directory cleaned');
  } catch (err) {
    logger.warn({ err }, 'Could not clean uploads directory');
  }
};

// Reset database (development mode)
const resetDatabase = () => {
  if (!isDev || !resetOnStart) return;

  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      logger.info('[DEV] Database reset - deleted existing DB file');
    }
    cleanUploads();
  } catch (err) {
    logger.error({ err }, 'Failed to reset database');
  }
};

const initializeDatabase = async () => {
  // Reset DB on start in development mode
  if (isDev && resetOnStart) {
    resetDatabase();
  }

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error({ err }, 'Failed to open database');
        reject(err);
      } else {
        const mode = isDev ? '[DEV - Fresh start]' : '[PROD]';
        logger.info({ dbPath, mode }, 'Database connected');
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
        logger.info('[DEV] Schema initialized - all tables empty');
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
