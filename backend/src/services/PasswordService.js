const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

class PasswordService {
  async hash(password) {
    const salt = crypto.randomBytes(16);
    const derived = await scrypt(password, salt, 64);
    return `scrypt:${salt.toString('base64url')}:${derived.toString('base64url')}`;
  }

  async verify(password, storedHash) {
    const [algorithm, saltText, hashText] = String(storedHash || '').split(':');
    if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
    const expected = Buffer.from(hashText, 'base64url');
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  }
}

module.exports = PasswordService;
