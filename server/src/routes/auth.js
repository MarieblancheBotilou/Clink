// Sign up and log in. See docs/api.md endpoints 1 and 2.
const express = require('express');
const bcrypt = require('bcryptjs');
const { sequelize, User, Settings } = require('../models');
const AppError = require('../utils/AppError');
const { createLoginToken, createShortcutToken } = require('../utils/tokens');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, timezone = 'America/Chicago' } = req.body || {};

  // 1. Validate input (acceptance criteria from US-1)
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanName || cleanName.length > 50) {
    throw new AppError(400, 'INVALID_NAME', 'Please enter your name (up to 50 characters).');
  }
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw new AppError(400, 'INVALID_EMAIL', 'Please enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(400, 'WEAK_PASSWORD', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!isValidTimezone(timezone)) {
    throw new AppError(400, 'INVALID_TIMEZONE', 'Time zone is not recognized.');
  }

  // 2. One account per email
  if (await User.findOne({ where: { email: cleanEmail } })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Try logging in.');
  }

  // 3. Hash the password: we store a scrambled version, never the real one
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Create the user AND their default settings together.
  //    A transaction means: if either step fails, neither is saved.
  const user = await sequelize.transaction(async (transaction) => {
    const newUser = await User.create(
      { name: cleanName, email: cleanEmail, passwordHash, shortcutToken: createShortcutToken(), timezone },
      { transaction }
    );
    await Settings.create({ userId: newUser.id }, { transaction });
    return newUser;
  });

  res.status(201).json({ token: createLoginToken(user.id), user: user.toPublicJSON() });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const user = cleanEmail ? await User.findOne({ where: { email: cleanEmail } }) : null;
  const passwordMatches = user && typeof password === 'string' && (await bcrypt.compare(password, user.passwordHash));

  // Same message whether the email or the password is wrong, so attackers
  // can't use this to find out which emails have accounts.
  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  res.json({ token: createLoginToken(user.id), user: user.toPublicJSON() });
});

module.exports = router;
