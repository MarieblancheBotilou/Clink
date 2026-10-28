// Shared test helpers.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, User } = require('../src/models');

async function resetDatabase() {
  await sequelize.query('TRUNCATE users RESTART IDENTITY CASCADE');
}

// Signs up a user and returns everything a test needs to act as them.
async function signUp(overrides = {}) {
  const body = { name: 'Marie', email: 'marie@example.com', password: 'supersecret1', ...overrides };
  const res = await request(app).post('/api/auth/signup').send(body);
  const user = await User.findByPk(res.body.user.id);
  return {
    user,
    auth: { Authorization: `Bearer ${res.body.token}` },
    shortcut: { 'X-Shortcut-Token': user.shortcutToken },
  };
}

module.exports = { app, request, sequelize, resetDatabase, signUp };
