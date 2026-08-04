class CertificateCatalogService {
  constructor(catalogRepository) {
    this.catalog = catalogRepository;
  }

  async getPublicCatalog() {
    const [levelRows, productRows] = await Promise.all([
      this.catalog.listActiveLevels(),
      this.catalog.listActiveProducts(),
    ]);
    const featureRows = await this.catalog.listFeatures(productRows.map((product) => product.id));
    const featuresByProduct = featureRows.reduce((result, feature) => {
      if (!result[feature.product_id]) result[feature.product_id] = [];
      result[feature.product_id].push(feature.label);
      return result;
    }, {});

    return {
      levels: levelRows.map((level) => ({
        id: level.id,
        code: level.code,
        name: level.name,
        description: level.description,
        scoreMin: level.score_min,
        scoreMax: level.score_max,
        rank: level.rank,
        badgeEligible: Boolean(level.badge_eligible),
      })),
      products: productRows.map((product) => ({
        id: product.id,
        code: product.code,
        productType: product.product_type,
        name: product.name,
        description: product.description,
        ctaLabel: product.cta_label,
        displayOrder: product.display_order,
        level: product.level_id ? {
          id: product.level_id,
          code: product.level_code,
          name: product.level_name,
          description: product.level_description,
          scoreMin: product.score_min,
          scoreMax: product.score_max,
          rank: product.level_rank,
          badgeEligible: Boolean(product.badge_eligible),
        } : null,
        price: product.price_id ? {
          id: product.price_id,
          amountMinor: product.amount_minor,
          currency: product.currency,
          billingPeriod: product.billing_period,
        } : null,
        features: featuresByProduct[product.id] || [],
      })),
    };
  }
}

module.exports = CertificateCatalogService;
