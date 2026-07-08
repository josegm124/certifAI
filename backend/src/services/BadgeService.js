const { Badge, BADGE_TIERS } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class BadgeService {
  constructor(badgeRepository, assessmentRepository) {
    this.badgeRepository = badgeRepository;
    this.assessmentRepository = assessmentRepository;
  }

  // Crear badge después de assessment completo
  async issueBadge(assessmentId, organizationId, tier, overallScore, frameworks = []) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 12 meses

    const badge = new Badge({
      id: uuidv4(),
      assessmentId,
      organizationId,
      tier,
      score: overallScore,
      issuedAt: new Date(),
      expiresAt,
      verificationToken: uuidv4(),
      frameworksIncluded: frameworks
    });

    await this.badgeRepository.create(badge);
    logger.info(
      { badgeId: badge.id, tier, organizationId },
      'Badge issued'
    );

    return badge;
  }

  // Obtener badge activo
  async getActiveBadge(assessmentId) {
    const badge = await this.badgeRepository.findByAssessment(assessmentId);

    if (!badge) return null;
    if (badge.isExpired()) {
      logger.warn({ badgeId: badge.id }, 'Badge has expired');
      return null;
    }

    return badge;
  }

  // Listar badges que necesitan renewal
  async findRenewingSoon(daysThreshold = 60) {
    const badges = await this.badgeRepository.findRenewingSoon(daysThreshold);
    logger.info({ count: badges.length, daysThreshold }, 'Renewal badges found');
    return badges;
  }

  // Verificar badge por token
  async verifyBadge(token) {
    const badge = await this.badgeRepository.findByToken(token);

    if (!badge) {
      logger.warn({ token }, 'Badge verification failed - not found');
      return null;
    }

    if (badge.isExpired()) {
      logger.warn({ badgeId: badge.id }, 'Badge verification failed - expired');
      return null;
    }

    logger.debug({ badgeId: badge.id }, 'Badge verified');
    return badge;
  }

  // Reissue (renewal) de un badge
  async renewBadge(assessmentId, organizationId, tier, overallScore, frameworks) {
    // Invalidar badge anterior
    const oldBadge = await this.badgeRepository.findByAssessment(assessmentId);

    // Crear nuevo badge
    const newBadge = await this.issueBadge(
      assessmentId,
      organizationId,
      tier,
      overallScore,
      frameworks
    );

    logger.info(
      { oldBadgeId: oldBadge?.id, newBadgeId: newBadge.id },
      'Badge renewed'
    );

    return newBadge;
  }

  // Mapeo de tier a badge metadata
  getBadgeMetadata(tier) {
    const metadata = {
      [BADGE_TIERS.AWARE]: {
        label: 'Aware',
        icon: '🔹',
        description: 'Initial awareness of AI governance requirements',
        color: '#FFA500'
      },
      [BADGE_TIERS.ALIGNED]: {
        label: 'Aligned',
        icon: '⭐',
        description: 'Governance practices aligned with frameworks',
        color: '#FFD700'
      },
      [BADGE_TIERS.ASSURED]: {
        label: 'Assured',
        icon: '✓',
        description: 'Comprehensive governance assurance',
        color: '#00AA00'
      }
    };

    return metadata[tier] || metadata[BADGE_TIERS.AWARE];
  }
}

module.exports = BadgeService;
