const TokenService = require('../services/TokenService');

const cookies = (header = '') => Object.fromEntries(
  header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  })
);

const createAuthMiddleware = (tokenService) => (req, _res, next) => {
  try {
    req.auth = tokenService.verify(cookies(req.headers.cookie)[TokenService.COOKIE_NAME]);
    next();
  } catch (error) { next(error); }
};

module.exports = createAuthMiddleware;
