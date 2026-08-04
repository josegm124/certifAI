const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const CertificateCatalogRepository = require('../src/repositories/CertificateCatalogRepository');
const CertificateCatalogService = require('../src/services/CertificateCatalogService');

const exec = (db, sql) => new Promise((resolve, reject) => {
  db.exec(sql, (error) => (error ? reject(error) : resolve()));
});

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, (error) => (error ? reject(error) : resolve()));
});

test('SQL catalog exposes related levels, products, prices and features', async (context) => {
  const db = new sqlite3.Database(':memory:');
  context.after(() => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve()))));
  await exec(db, 'PRAGMA foreign_keys = ON');
  await exec(db, fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));

  const service = new CertificateCatalogService(new CertificateCatalogRepository(db));
  const catalog = await service.getPublicCatalog();

  assert.deepEqual(catalog.levels.map((level) => level.code), ['A1', 'A2', 'A3', 'A4']);
  assert.deepEqual(catalog.products.map((product) => product.name), [
    'Readiness Assessment',
    'Aligned Certificate',
    'Assured Certificate',
    'Advanced Certificate',
  ]);
  assert.deepEqual(catalog.products.map((product) => product.price.amountMinor), [0, 49000, 119000, 249000]);
  assert.equal(catalog.products.find((product) => product.id === 'assured-certificate').level.id, 'assured');
  assert.equal(catalog.products.every((product) => product.features.length === 3), true);

  await assert.rejects(
    run(db, `INSERT INTO certificate_products
      (id, level_id, code, product_type, name, description, cta_label, display_order)
      VALUES ('invalid', 'missing-level', 'INVALID', 'certificate', 'Invalid', 'Invalid', 'Invalid', 99)`),
    /FOREIGN KEY constraint failed/
  );
});
