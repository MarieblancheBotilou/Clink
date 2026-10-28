// Tests for sign-up, log-in, and /api/me (US-1).
// Run with:  npm test   (uses the clink_test database, never your real data)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, Settings } = require('../src/models');

const validUser = { name: 'Marie', email: 'Marie@Example.com', password: 'supersecret1' };

beforeEach(async () => {
  // Start every test with empty tables
  await sequelize.query('TRUNCATE users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/health', () => {
  test('reports the server and database are up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });
});

describe('POST /api/auth/signup', () => {
  test('creates the user, default settings, and returns a token', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: 1, name: 'Marie', email: 'marie@example.com', timezone: 'America/Chicago' });

    const user = await User.findOne({ where: { email: 'marie@example.com' } });
    expect(user.passwordHash).not.toBe(validUser.password); // stored hashed, never plain
    expect(user.shortcutToken).toHaveLength(48);

    const settings = await Settings.findOne({ where: { userId: user.id } });
    expect(settings.notificationsOn).toBe(true);
    expect(settings.alertThresholdPct).toBe(75);
  });

  test('never returns the password hash or shortcut token', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.shortcutToken).toBeUndefined();
  });

  test.each([
    ['missing name', { ...validUser, name: '' }, 'INVALID_NAME'],
    ['bad email', { ...validUser, email: 'not-an-email' }, 'INVALID_EMAIL'],
    ['short password', { ...validUser, password: 'short' }, 'WEAK_PASSWORD'],
    ['bad time zone', { ...validUser, timezone: 'Mars/Olympus' }, 'INVALID_TIMEZONE'],
  ])('rejects %s with 400', async (_label, body, code) => {
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(await User.count()).toBe(0);
  });

  test('rejects a duplicate email (any capitalization) with 409', async () => {
    await request(app).post('/api/auth/signup').send(validUser);
    const res = await request(app).post('/api/auth/signup').send({ ...validUser, email: 'MARIE@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(validUser);
  });

  test('logs in with the right password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'marie@example.com', password: 'supersecret1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  test('rejects a wrong password with the same message as an unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'marie@example.com', password: 'nope-nope' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'who@example.com', password: 'supersecret1' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe('GET /api/me', () => {
  test('returns the logged-in user', async () => {
    const signup = await request(app).post('/api/auth/signup').send(validUser);
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${signup.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('marie@example.com');
  });

  test('rejects requests without a token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_LOGGED_IN');
  });

  test('rejects a fake token', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('Database rules (from docs/schema.md)', () => {
  test('a user cannot have two weekly budgets or two Monday caps', async () => {
    const { Budget } = require('../src/models');
    const signup = await request(app).post('/api/auth/signup').send(validUser);
    const userId = signup.body.user.id;

    await Budget.create({ userId, period: 'weekly', amount: 150 });
    await expect(Budget.create({ userId, period: 'weekly', amount: 99 })).rejects.toThrow();

    await Budget.create({ userId, period: 'daily', dayOfWeek: 0, amount: 20 });
    await expect(Budget.create({ userId, period: 'daily', dayOfWeek: 0, amount: 25 })).rejects.toThrow();
  });
});
