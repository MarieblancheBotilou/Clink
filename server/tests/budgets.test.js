// Weekly budget + daily caps (US-2). See docs/api.md endpoint 7.
const { app, request, sequelize, resetDatabase, signUp } = require('./helpers');

let me;
beforeEach(async () => {
  await resetDatabase();
  me = await signUp();
});
afterAll(() => sequelize.close());

const put = (body) => request(app).put('/api/budgets').set(me.auth).send(body);

test('starts with no budgets', async () => {
  const res = await request(app).get('/api/budgets').set(me.auth);
  expect(res.body).toEqual({ weekly: null, daily: null });
});

test('saves a weekly budget with the same daily cap every day', async () => {
  const res = await put({
    weekly: { amount: 150, is_active: true },
    daily: { mode: 'same', amount: 20, is_active: true },
  });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    weekly: { amount: 150, is_active: true },
    daily: { is_active: true, mode: 'same', amounts: [20, 20, 20, 20, 20, 20, 20] },
  });
});

test('saves different caps per day', async () => {
  const amounts = [15, 15, 15, 15, 30, 30, 30];
  const res = await put({ weekly: { amount: 150 }, daily: { mode: 'per_day', amounts } });
  expect(res.body.daily).toEqual({ is_active: true, mode: 'per_day', amounts });
});

test('rejects daily caps that add up to more than the weekly budget', async () => {
  const res = await put({ weekly: { amount: 150 }, daily: { mode: 'same', amount: 25 } });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('DAILY_EXCEEDS_WEEKLY');
  expect(res.body.error.message).toBe('Your daily caps add up to $175.00, which is more than your $150.00 weekly budget.');
  // and nothing was saved
  const check = await request(app).get('/api/budgets').set(me.auth);
  expect(check.body).toEqual({ weekly: null, daily: null });
});

test('checks the rule against what is already saved', async () => {
  await put({ weekly: { amount: 150 }, daily: { mode: 'same', amount: 20 } });
  const res = await put({ weekly: { amount: 100 } }); // 7 x $20 = $140 > $100
  expect(res.body.error.code).toBe('DAILY_EXCEEDS_WEEKLY');
});

test('allows daily caps over the weekly amount when the weekly budget is off', async () => {
  const res = await put({ weekly: { amount: 100, is_active: false }, daily: { mode: 'same', amount: 20 } });
  expect(res.status).toBe(200);
});

test('updates instead of duplicating', async () => {
  await put({ weekly: { amount: 150 } });
  await put({ weekly: { amount: 200 } });
  const res = await request(app).get('/api/budgets').set(me.auth);
  expect(res.body.weekly.amount).toBe(200);
});

test.each([
  ['zero weekly', { weekly: { amount: 0 } }, 'INVALID_AMOUNT'],
  ['letters', { weekly: { amount: 'abc' } }, 'INVALID_AMOUNT'],
  ['negative daily', { daily: { mode: 'same', amount: -5 } }, 'INVALID_AMOUNT'],
  ['6 days', { daily: { mode: 'per_day', amounts: [1, 1, 1, 1, 1, 1] } }, 'INVALID_INPUT'],
  ['unknown mode', { daily: { mode: 'monthly', amount: 5 } }, 'INVALID_INPUT'],
  ['empty body', {}, 'INVALID_INPUT'],
])('rejects %s', async (_label, body, code) => {
  const res = await put(body);
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe(code);
});

test('requires login', async () => {
  const res = await request(app).get('/api/budgets');
  expect(res.status).toBe(401);
});
