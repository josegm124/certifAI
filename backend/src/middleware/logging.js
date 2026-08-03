const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const details = {
      event: 'http.request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      userId: req.auth?.sub || null,
      companyId: req.auth?.companyId || null,
      ip: req.ip
    };
    logger.info(details, `${req.method} ${req.path}`);
    logger.metric.info(details);
  });

  next();
};

const errorHandler = (err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  }, 'Error occurred');

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    code: err.code || 'REQUEST_FAILED',
    status,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  requestLogger,
  errorHandler
};
