const { User } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class UserService {
  constructor(userRepository, companyService) {
    this.userRepository = userRepository;
    this.companyService = companyService;
  }

  // Entry point for the HOME form: find-or-create the company by name, then
  // find-or-create the user (lead) by email under that company. No login/
  // password — this just records who started an assessment and for which company.
  async registerLead(companyName, email, role) {
    let user = await this.userRepository.findByEmail(email);
    if (user) {
      logger.warn({ email }, 'User already exists');
      return user;
    }

    const company = await this.companyService.findOrCreateByName(companyName);

    user = new User({ id: uuidv4(), companyId: company.id, email, role });
    await this.userRepository.create(user);
    logger.info({ userId: user.id, companyId: company.id, email }, 'User created');
    return user;
  }

  async getUser(userId) {
    return this.userRepository.findById(userId);
  }

  async getUserByEmail(email) {
    return this.userRepository.findByEmail(email);
  }

  async getUsersForCompany(companyId) {
    return this.userRepository.findByCompany(companyId);
  }
}

module.exports = UserService;
