const { Company, TIERS } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class CompanyService {
  constructor(companyRepository) {
    this.companyRepository = companyRepository;
  }

  async findOrCreateByName(name) {
    let company = await this.companyRepository.findByName(name);
    if (company) return company;

    company = new Company({ id: uuidv4(), name, tier: TIERS.FREE });
    await this.companyRepository.create(company);
    logger.info({ companyId: company.id, name }, 'Company created');
    return company;
  }

  async getCompany(companyId) {
    return this.companyRepository.findById(companyId);
  }

  async updateCompany(companyId, data) {
    const company = await this.companyRepository.findById(companyId);

    if (data.name) company.name = data.name;
    if (data.tier) company.tier = data.tier;

    company.updatedAt = new Date();
    await this.companyRepository.update(company);

    logger.info({ companyId }, 'Company updated');
    return company;
  }

  async getAllCompanies() {
    return this.companyRepository.findAll();
  }
}

module.exports = CompanyService;
