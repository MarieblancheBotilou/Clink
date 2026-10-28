// Login tokens (JWTs) for the app, and shortcut tokens for the Apple Pay shortcut.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  return secret;
}

// Creates a signed token that says "this request is from user #id".
function createLoginToken(userId) {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Returns the user id inside a token, or throws if it's fake or expired.
function verifyLoginToken(token) {
  return Number(jwt.verify(token, getJwtSecret()).sub);
}

// 48 random characters. Long and random enough that it can't be guessed.
function createShortcutToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = { createLoginToken, verifyLoginToken, createShortcutToken };
