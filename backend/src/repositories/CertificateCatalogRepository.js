const BaseRepository = require('./BaseRepository');

class CertificateCatalogRepository extends BaseRepository {
  constructor(db) {
    super(db, 'certificate_products');
  }

  async listActiveProducts() {
    return this.all(`
      SELECT
        product.id,
        product.code,
        product.product_type,
        product.name,
        product.description,
        product.cta_label,
        product.display_order,
        level.id AS level_id,
        level.code AS level_code,
        level.name AS level_name,
        level.description AS level_description,
        level.score_min,
        level.score_max,
        level.rank AS level_rank,
        level.badge_eligible,
        price.id AS price_id,
        price.amount_minor,
        price.currency,
        price.billing_period
      FROM certificate_products product
      LEFT JOIN certificate_levels level ON level.id = product.level_id
      LEFT JOIN product_prices price ON price.id = (
        SELECT candidate.id
        FROM product_prices candidate
        WHERE candidate.product_id = product.id
          AND candidate.active = 1
          AND datetime(candidate.valid_from) <= datetime('now')
          AND (candidate.valid_until IS NULL OR datetime(candidate.valid_until) > datetime('now'))
        ORDER BY datetime(candidate.valid_from) DESC, candidate.id DESC
        LIMIT 1
      )
      WHERE product.active = 1
      ORDER BY product.display_order
    `);
  }

  async listActiveLevels() {
    return this.all(`
      SELECT id, code, name, description, score_min, score_max, rank, badge_eligible
      FROM certificate_levels
      ORDER BY rank
    `);
  }

  async listFeatures(productIds) {
    if (!productIds.length) return [];
    const placeholders = productIds.map(() => '?').join(', ');
    return this.all(`
      SELECT product_id, label, display_order
      FROM certificate_product_features
      WHERE product_id IN (${placeholders})
      ORDER BY product_id, display_order
    `, productIds);
  }
}

module.exports = CertificateCatalogRepository;
