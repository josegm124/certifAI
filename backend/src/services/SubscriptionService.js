const { Subscription, TIERS } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const TIER_PRICING = {
  [TIERS.FREE]: 0,
  [TIERS.STARTER]: 490,
  [TIERS.PROFESSIONAL]: 1490,
  [TIERS.ENTERPRISE]: 3500
};

class SubscriptionService {
  constructor(subscriptionRepository, companyRepository) {
    this.subscriptionRepository = subscriptionRepository;
    this.companyRepository = companyRepository;
  }

  async createSubscription(companyId, tier) {
    if (tier === TIERS.FREE) {
      logger.info({ companyId }, 'Free tier - no subscription created');
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const subscription = new Subscription({
      id: uuidv4(),
      companyId,
      tier,
      priceEur: TIER_PRICING[tier],
      expiresAt
    });

    await this.subscriptionRepository.create(subscription);

    const company = await this.companyRepository.findById(companyId);
    company.subscriptionId = subscription.id;
    company.subscriptionExpiresAt = expiresAt;
    await this.companyRepository.update(company);

    logger.info({ subscriptionId: subscription.id, tier }, 'Subscription created');
    return subscription;
  }

  async getSubscription(companyId) {
    return this.subscriptionRepository.findByCompany(companyId);
  }

  async upgradeTier(companyId, newTier) {
    let subscription = await this.subscriptionRepository.findByCompany(companyId);
    const company = await this.companyRepository.findById(companyId);

    if (!subscription) {
      subscription = await this.createSubscription(companyId, newTier);
    } else {
      subscription.tier = newTier;
      subscription.priceEur = TIER_PRICING[newTier];
      subscription.updatedAt = new Date();
      await this.subscriptionRepository.update(subscription);
    }

    company.tier = newTier;
    await this.companyRepository.update(company);

    logger.info({ companyId, newTier }, 'Tier upgraded');
    return subscription;
  }

  async renewSubscription(companyId, tier = null) {
    let subscription = await this.subscriptionRepository.findByCompany(companyId);

    if (!subscription) {
      subscription = await this.createSubscription(companyId, tier || TIERS.PROFESSIONAL);
    } else {
      subscription.expiresAt = new Date();
      subscription.expiresAt.setFullYear(subscription.expiresAt.getFullYear() + 1);
      subscription.status = 'active';
      subscription.renewalEmailSentAt = null;
      subscription.updatedAt = new Date();
      await this.subscriptionRepository.update(subscription);
    }

    const company = await this.companyRepository.findById(companyId);
    company.subscriptionExpiresAt = subscription.expiresAt;
    await this.companyRepository.update(company);

    logger.info({ companyId }, 'Subscription renewed');
    return subscription;
  }

  async findExpiringSubscriptions(daysThreshold = 30) {
    return this.subscriptionRepository.findExpiringWithin(daysThreshold);
  }

  getTierFeatures(tier) {
    const features = {
      [TIERS.FREE]: {
        assessments: 1,
        frameworks: 1,
        systems: 1,
        annualReasessment: false,
        badge: false
      },
      [TIERS.STARTER]: {
        assessments: 5,
        frameworks: 2,
        systems: 1,
        annualReasessment: false,
        badge: true
      },
      [TIERS.PROFESSIONAL]: {
        assessments: null,
        frameworks: 7,
        systems: 3,
        annualReasessment: true,
        badge: true
      },
      [TIERS.ENTERPRISE]: {
        assessments: null,
        frameworks: 7,
        systems: null,
        annualReasessment: true,
        badge: true,
        api: true,
        whitelabel: true
      }
    };

    return features[tier] || features[TIERS.FREE];
  }
}

module.exports = SubscriptionService;
