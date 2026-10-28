// The logged-in user's own account. See docs/api.md endpoints 3-5.
const express = require('express');
const bcrypt = require('bcryptjs');
const requireAuth = require('../middleware/requireAuth');
const AppError = require('../utils/AppError');
const { isValidTimezone } = require('../utils/validation');

const router = express.Router();

router.use(requireAuth); // every route below needs a login token

// GET /api/me
router.get('/', (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// PATCH /api/me: change name and/or time zone
router.patch('/', async (req, res) => {
  const { name, timezone } = req.body || {};
  if (name === undefined && timezone === undefined) {
    throw new AppError(400, 'INVALID_INPUT', 'Send a name, a time zone, or both.');
  }
  if (name !== undefined) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || cleanName.length > 50) {
      throw new AppError(400, 'INVALID_NAME', 'Please enter your name (up to 50 characters).');
    }
    req.user.name = cleanName;
  }
  if (timezone !== undefined) {
    if (!isValidTimezone(timezone)) throw new AppError(400, 'INVALID_TIMEZONE', 'Time zone is not recognized.');
    req.user.timezone = timezone;
  }
  await req.user.save();
  res.json({ user: req.user.toPublicJSON() });
});

// DELETE /api/me: permanently delete the account and ALL its data.
// Asks for the password again so a stolen or forgotten-open session can't do it.
router.delete('/', async (req, res) => {
  const { password } = req.body || {};
  const correct = typeof password === 'string' && (await bcrypt.compare(password, req.user.passwordHash));
  if (!correct) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Enter your password to delete your account.');
  }
  await req.user.destroy(); // settings, budgets, and purchases are deleted too (ON DELETE CASCADE)
  res.status(204).end();
});

module.exports = router;
