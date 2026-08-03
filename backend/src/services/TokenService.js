const crypto = require('crypto');
const httpError = require('../utils/httpError');

const FIVE_HOURS_SECONDS = 5 * 60 * 60;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

class TokenService {
  constructor(secret = process.env.JWT_SECRET || 'certifai-local-demo-secret-change-me') {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }
    this.secret = secret;
  }

  sign(user) {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({ sub: user.id, companyId: user.companyId, iat: now, exp: now + FIVE_HOURS_SECONDS, iss: 'certifai' });
    const content = `${header}.${payload}`;
    return `${content}.${crypto.createHmac('sha256', this.secret).update(content).digest('base64url')}`;
  }

  verify(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw httpError(401, 'Authentication required', 'UNAUTHENTICATED');
    const content = `${parts[0]}.${parts[1]}`;
    const expected = crypto.createHmac('sha256', this.secret).update(content).digest();
    const supplied = Buffer.from(parts[2], 'base64url');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      throw httpError(401, 'Invalid session', 'INVALID_SESSION');
    }
    let payload;
    try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); }
    catch { throw httpError(401, 'Invalid session', 'INVALID_SESSION'); }
    if (payload.iss !== 'certifai' || !payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw httpError(401, 'Session expired', 'SESSION_EXPIRED');
    }
    return payload;
  }
}

TokenService.COOKIE_NAME = 'certifai_session';
TokenService.MAX_AGE_MS = FIVE_HOURS_SECONDS * 1000;
module.exports = TokenService;
