const LEVEL_RANK = { aware: 1, aligned: 2, assured: 3, advanced: 4 };
const PRODUCT_LEVEL = {
  'aligned-certificate': 'aligned',
  'assured-certificate': 'assured',
  'advanced-certificate': 'advanced',
};

class EligibilityService {
  products(resultLevelId, flags, activeProductIds = Object.keys(PRODUCT_LEVEL)) {
    const earnedRank = LEVEL_RANK[resultLevelId] || 0;
    const statuses = flags.map((flag) => flag.status || (Number(flag.failed) === 1 ? 'failed' : 'passed'));
    const gatePassed = flags.length === 9 && statuses.every((status) => status === 'passed');
    if (earnedRank < LEVEL_RANK.aligned || !gatePassed) return [];
    return activeProductIds.filter((productId) => {
      const productLevel = PRODUCT_LEVEL[productId];
      return productLevel && LEVEL_RANK[productLevel] <= earnedRank;
    });
  }

  describe(resultLevelId, flags, activeProductIds) {
    const eligibleProductIds = this.products(resultLevelId, flags, activeProductIds);
    const failedCriticalCount = flags.filter((flag) => (flag.status || (Number(flag.failed) === 1 ? 'failed' : 'passed')) === 'failed').length;
    return {
      allowed: eligibleProductIds.length > 0,
      earnedLevel: resultLevelId,
      failedCriticalCount,
      eligibleProductIds,
    };
  }
}

module.exports = EligibilityService;
module.exports.LEVEL_RANK = LEVEL_RANK;
module.exports.PRODUCT_LEVEL = PRODUCT_LEVEL;
