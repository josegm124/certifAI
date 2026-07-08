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
  constructor(subscriptionRepository, organizationRepository) {
    this.subscriptionRepository = subscriptionRepository;
    this.organizationRepository = organizationRepository;
  }

  async createSubscription(organizationId, tier) {
    if (tier === TIERS.FREE) {
      logger.info({ organizationId }, 'Free tier - no subscription created');
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const subscription = new Subscription({
      id: uuidv4(),
      organizationId,
      tier,
      priceEur: TIER_PRICING[tier],
      expiresAt
    });

    await this.subscriptionRepository.create(subscription);

    // Update org
    const org = await this.organizationRepository.findById(organizationId);
    org.subscriptionId = subscription.id;
    org.subscriptionExpiresAt = expiresAt;
    await this.organizationRepository.update(org);

    logger.info({ subscriptionId: subscription.id, tier }, 'Subscription created');
    return subscription;
  }

  async getSubscription(organizationId) {
    return this.subscriptionRepository.findByOrg(organizationId);
  }

  async upgradeTier(organizationId, newTier) {
    let subscription = await this.subscriptionRepository.findByOrg(organizationId);
    const org = await this.organizationRepository.findById(organizationId);

    if (!subscription) {
      subscription = await this.createSubscription(organizationId, newTier);
    } else {
      subscription.tier = newTier;
      subscription.priceEur = TIER_PRICING[newTier];
      subscription.updatedAt = new Date();
      await this.subscriptionRepository.update(subscription);
    }

    org.tier = newTier;
    await this.organizationRepository.update(org);

    logger.info({ organizationId, newTier }, 'Tier upgraded');
    return subscription;
  }

  async renewSubscription(organizationId, tier = null) {
    let subscription = await this.subscriptionRepository.findByOrg(organizationId);

    if (!subscription) {
      subscription = await this.createSubscription(organizationId, tier || TIERS.PROFESSIONAL);
    } else {
      subscription.expiresAt = new Date();
      subscription.expiresAt.setFullYear(subscription.expiresAt.getFullYear() + 1);
      subscription.status = 'active';
      subscription.renewalEmailSentAt = null;
      subscription.updatedAt = new Date();
      await this.subscriptionRepository.update(subscription);
    }

    const org = await this.organizationRepository.findById(organizationId);
    org.subscriptionExpiresAt = subscription.expiresAt;
    await this.organizationRepository.update(org);

    logger.info({ organizationId }, 'Subscription renewed');
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
