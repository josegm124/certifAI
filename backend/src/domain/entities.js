const { v4: uuidv4 } = require('uuid');

// Business tier
const TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// Badge tiers (governance maturity)
const BADGE_TIERS = {
  AWARE: 'aware',
  ALIGNED: 'aligned',
  ASSURED: 'assured'
};

class Organization {
  constructor({
    id = uuidv4(),
    name,
    email,
    role = null,
    tier = TIERS.FREE,
    subscriptionId = null,
    subscriptionExpiresAt = null,
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.tier = tier;
    this.subscriptionId = subscriptionId;
    this.subscriptionExpiresAt = subscriptionExpiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isSubscriptionActive() {
    if (!this.subscriptionExpiresAt) return false;
    return new Date(this.subscriptionExpiresAt) > new Date();
  }
}

class AiSystem {
  constructor({
    id = uuidv4(),
    organizationId,
    name,
    description = '',
    createdAt = new Date()
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
  }
}

class Assessment {
  constructor({
    id = uuidv4(),
    organizationId,
    aiSystemId,
    tier = TIERS.FREE,
    completionPercentage = 0,
    overallScore = 0,
    badgeTier = BADGE_TIERS.AWARE,
    criticalGatingActive = false,
    completedAt = null,
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.aiSystemId = aiSystemId;
    this.tier = tier;
    this.completionPercentage = completionPercentage;
    this.overallScore = overallScore;
    this.badgeTier = badgeTier;
    this.criticalGatingActive = criticalGatingActive;
    this.completedAt = completedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isComplete() {
    return this.completionPercentage === 100;
  }
}

class AssessmentAnswer {
  constructor({
    id = uuidv4(),
    assessmentId,
    questionId,
    score = null,
    evidence = '',
    attestation = '',
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.id = id;
    this.assessmentId = assessmentId;
    this.questionId = questionId;
    this.score = score;
    this.evidence = evidence;
    this.attestation = attestation;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isAnswered() {
    return this.score !== null && this.score !== undefined;
  }
}

class Badge {
  constructor({
    id = uuidv4(),
    assessmentId,
    organizationId,
    tier = BADGE_TIERS.AWARE,
    score = 0,
    issuedAt = new Date(),
    expiresAt,
    verificationToken = uuidv4(),
    frameworksIncluded = []
  } = {}) {
    this.id = id;
    this.assessmentId = assessmentId;
    this.organizationId = organizationId;
    this.tier = tier;
    this.score = score;
    this.issuedAt = issuedAt;
    this.expiresAt = expiresAt;
    this.verificationToken = verificationToken;
    this.frameworksIncluded = frameworksIncluded;
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  isRenewingSoon(daysThreshold = 60) {
    const now = new Date();
    const expiryDate = new Date(this.expiresAt);
    const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
  }
}

class Dossier {
  constructor({
    id = uuidv4(),
    assessmentId,
    organizationId,
    frameworks = [],
    pdfUrl = null,
    jsonUrl = null,
    generatedAt = new Date()
  } = {}) {
    this.id = id;
    this.assessmentId = assessmentId;
    this.organizationId = organizationId;
    this.frameworks = frameworks;
    this.pdfUrl = pdfUrl;
    this.jsonUrl = jsonUrl;
    this.generatedAt = generatedAt;
  }
}

class Subscription {
  constructor({
    id = uuidv4(),
    organizationId,
    tier = TIERS.FREE,
    priceEur = 0,
    startsAt = new Date(),
    expiresAt,
    renewalEmailSentAt = null,
    status = 'active'
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.tier = tier;
    this.priceEur = priceEur;
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
    this.renewalEmailSentAt = renewalEmailSentAt;
    this.status = status;
  }

  isActive() {
    return this.status === 'active' && new Date() <= new Date(this.expiresAt);
  }
}

class AuditLog {
  constructor({
    id = uuidv4(),
    organizationId = null,
    assessmentId = null,
    action,
    details = null,
    ipAddress = null,
    createdAt = new Date()
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.assessmentId = assessmentId;
    this.action = action;
    this.details = details;
    this.ipAddress = ipAddress;
    this.createdAt = createdAt;
  }
}

module.exports = {
  TIERS,
  BADGE_TIERS,
  Organization,
  AiSystem,
  Assessment,
  AssessmentAnswer,
  Badge,
  Dossier,
  Subscription,
  AuditLog
};
