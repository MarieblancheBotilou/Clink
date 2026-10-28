// Protects the endpoints the Apple Pay shortcut calls (marked ⚡ in docs/api.md).
// Expects the header:  X-Shortcut-Token: <the user's shortcut token>
const AppError = require('../utils/AppError');
const { User } = require('../models');

module.exports = async function requireShortcut(req, res, next) {
  const token = req.get('X-Shortcut-Token');
  const user = token ? await User.findOne({ where: { shortcutToken: token } }) : null;
  if (!user) {
    throw new AppError(401, 'INVALID_SHORTCUT_TOKEN', 'This shortcut is not connected to a Clink account. Set it up again in Clink.');
  }
  req.user = user;
  next();
};
