// Last stop for every error. Sends the standard error shape from docs/api.md.
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // Malformed JSON in the request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
  }
  // Anything unexpected: log it for us, but don't leak details to the user.
  console.error(err);
  return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong on our end.' } });
};
