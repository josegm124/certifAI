const { Organization, TIERS } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class OrganizationService {
  constructor(organizationRepository) {
    this.organizationRepository = organizationRepository;
  }

  async createOrganization(name, email) {
    let org = await this.organizationRepository.findByEmail(email);

    if (org) {
      logger.warn({ email }, 'Organization already exists');
      return org;
    }

    org = new Organization({
      id: uuidv4(),
      name,
      email,
      tier: TIERS.FREE
    });

    await this.organizationRepository.create(org);
    logger.info({ organizationId: org.id, email }, 'Organization created');
    return org;
  }

  async getOrganization(organizationId) {
    return this.organizationRepository.findById(organizationId);
  }

  async getOrganizationByEmail(email) {
    return this.organizationRepository.findByEmail(email);
  }

  async updateOrganization(organizationId, data) {
    const org = await this.organizationRepository.findById(organizationId);

    if (data.name) org.name = data.name;
    if (data.tier) org.tier = data.tier;

    org.updatedAt = new Date();
    await this.organizationRepository.update(org);

    logger.info({ organizationId }, 'Organization updated');
    return org;
  }

  async getAllOrganizations() {
    return this.organizationRepository.findAll();
  }
}

module.exports = OrganizationService;
