const httpError = (status, message, code = 'REQUEST_FAILED') => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

module.exports = httpError;
