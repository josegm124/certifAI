const { User } = require('../domain/entities');
const { v4: uuidv4 } = require('uuid');
const httpError = require('../utils/httpError');
const logger = require('../config/logger');
const { isPasswordValid, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');

const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const publicUser = (user, company) => ({
  id: user.id, email: user.email, name: user.name, role: user.role,
  company: { id: company.id, name: company.name },
});

class AuthService {
  constructor(userRepository, companyService, passwordService) {
    this.users = userRepository;
    this.companies = companyService;
    this.passwords = passwordService;
  }

  async register(input) {
    const companyName = clean(input.companyName);
    const email = clean(input.email).toLowerCase();
    const name = clean(input.name);
    const role = clean(input.role);
    const password = String(input.password || '');
    if (!companyName || !email || !name || !role || !email.includes('@')) {
      throw httpError(400, 'Company, valid email, name and role are required', 'INVALID_REGISTRATION');
    }
    if (!isPasswordValid(password)) {
      throw httpError(400, PASSWORD_POLICY_MESSAGE, 'WEAK_PASSWORD');
    }
    if (await this.users.findByEmail(email)) throw httpError(409, 'Email is already registered', 'EMAIL_EXISTS');
    const existingCompany = await this.companies.companyRepository.findByName(companyName);
    if (existingCompany) throw httpError(409, 'Company is already registered', 'COMPANY_EXISTS');
    const company = await this.companies.findOrCreateByName(companyName);
    const user = new User({ id: uuidv4(), companyId: company.id, email, passwordHash: await this.passwords.hash(password), name, role });
    await this.users.create(user);
    logger.audit.info({ event: 'account.registered', userId: user.id, companyId: company.id });
    return { user, profile: publicUser(user, company) };
  }

  async login(emailInput, password) {
    const user = await this.users.findByEmail(clean(emailInput).toLowerCase());
    if (!user || !(await this.passwords.verify(String(password || ''), user.passwordHash))) {
      throw httpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    const company = await this.companies.getCompany(user.companyId);
    logger.audit.info({ event: 'account.login_succeeded', userId: user.id, companyId: user.companyId });
    return { user, profile: publicUser(user, company) };
  }

  async profile(userId) {
    const user = await this.users.findById(userId);
    if (!user) throw httpError(401, 'Account not found', 'UNAUTHENTICATED');
    const company = await this.companies.getCompany(user.companyId);
    return publicUser(user, company);
  }

  async updateProfile(userId, input) {
    const user = await this.users.findById(userId);
    const name = clean(input.name);
    const role = clean(input.role);
    if (!user || !name || !role) throw httpError(400, 'Name and role are required', 'INVALID_PROFILE');
    user.name = name; user.role = role;
    await this.users.update(user);
    logger.audit.info({ event: 'account.profile_updated', userId: user.id, companyId: user.companyId });
    return this.profile(userId);
  }
}

module.exports = AuthService;
