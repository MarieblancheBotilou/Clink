// Protects app routes (marked 🔑 in docs/api.md).
// Expects the header:  Authorization: Bearer <login token>
const AppError = require('../utils/AppError');
const { verifyLoginToken } = require('../utils/tokens');
const { User } = require('../models');

module.exports = async function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'NOT_LOGGED_IN', 'Please log in to continue.');
  }

  let userId;
  try {
    userId = verifyLoginToken(token);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please log in again.');
  }

  const user = await User.findByPk(userId);
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please log in again.');

  req.user = user; // later handlers can use req.user
  next();
};
