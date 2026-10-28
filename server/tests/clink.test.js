// The clink (US-4, US-5): purchases, notifications, alerts, and the Home screen.
const { app, request, sequelize, resetDatabase, signUp } = require('./helpers');
const { getStatus } = require('../src/services/spendingService');
const { Purchase } = require('../src/models');

let me;
beforeEach(async () => {
  await resetDatabase();
  me = await signUp();
  // $20 every day, inside a $140 week (7 x $20)
  const res = await request(app).put('/api/budgets').set(me.auth)
    .send({ weekly: { amount: 140 }, daily: { mode: 'same', amount: 20 } });
  expect(res.status).toBe(200);
});
afterAll(() => sequelize.close());

const pay = (body) => request(app).post('/api/purchases').set(me.shortcut).send(body);

test('records a purchase and says what was spent and what is left', async () => {
  const res = await pay({ amount: 6, merchant: 'Starbucks' });
  expect(res.status).toBe(201);
  expect(res.body.notification).toBe('You spent $6.00 at Starbucks · $14.00 left today · $134.00 left this week');
  expect(res.body.today_remaining).toBe(14);
  expect(res.body.week_remaining).toBe(134);
  expect(res.body.alerts).toEqual([]);
  expect(res.body.play_sound).toBe(true);
});

test('accepts amounts the way Apple Shortcuts sends them ("$6.50")', async () => {
  const res = await pay({ amount: '$6.50' });
  expect(res.body.notification).toBe('You spent $6.50 · $13.50 left today · $133.50 left this week');
});

test('gives a heads-up at the alert level (75% by default)', async () => {
  const res = await pay({ amount: 16, merchant: 'Target' });
  expect(res.body.alerts).toEqual(['daily_heads_up']);
  expect(res.body.notification).toMatch(/^Heads up: You spent \$16\.00 at Target/);
});

test('says when today\'s limit is reached, with a negative amount when over', async () => {
  await pay({ amount: 15 });
  const res = await pay({ amount: 10, merchant: 'Chipotle' });
  expect(res.body.alerts).toEqual(['daily_limit']);
  expect(res.body.today_remaining).toBe(-5);
  expect(res.body.notification).toBe(
    "You've reached today's limit · You spent $10.00 at Chipotle · −$5.00 over today · $115.00 left this week. Check your bank app."
  );
});

test('says when the weekly limit is reached', async () => {
  const res = await pay({ amount: 145 });
  expect(res.body.alerts).toEqual(['daily_limit', 'weekly_limit']);
  expect(res.body.notification).toBe(
    "You've reached this week's limit · You spent $145.00 · −$5.00 over this week. Check your bank app."
  );
});

test('follows the user\'s sound setting', async () => {
  const { Settings } = require('../src/models');
  await Settings.update({ soundOn: false }, { where: { userId: me.user.id } });
  const res = await pay({ amount: 1 });
  expect(res.body.play_sound).toBe(false);
});

test('rejects an unknown shortcut token', async () => {
  const res = await request(app).post('/api/purchases').set('X-Shortcut-Token', 'nope').send({ amount: 5 });
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('INVALID_SHORTCUT_TOKEN');
});

test.each([[0], [-3], ['abc'], [undefined]])('rejects amount %p', async (amount) => {
  const res = await pay({ amount });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('INVALID_AMOUNT');
});

test('rejects a purchase date in the future', async () => {
  const res = await pay({ amount: 5, purchased_at: '2999-01-01T00:00:00Z' });
  expect(res.body.error.code).toBe('INVALID_DATE');
});

test('Home screen status shows today (the jar) and the week', async () => {
  await pay({ amount: 5 });
  const res = await request(app).get('/api/status').set(me.auth);
  expect(res.body.jar).toBe('today');
  expect(res.body.today).toEqual({ cap: 20, spent: 5, remaining: 15, percent_used: 25, jar_stage: 5 });
  expect(res.body.week).toEqual({ budget: 140, spent: 5, remaining: 135, percent_used: 4, jar_stage: 6 });
});

test('a late-night purchase counts toward the user\'s own day, not UTC', async () => {
  // 11:30 PM Monday in College Station = 4:30 AM Tuesday UTC
  const lateMonday = new Date('2026-10-27T04:30:00Z');
  await Purchase.create({ userId: me.user.id, amount: 8, purchasedAt: lateMonday });

  const mondayNight = await getStatus(me.user, new Date('2026-10-27T04:45:00Z'));
  expect(mondayNight.today.spent).toBe(8); // still Monday for her

  const tuesdayMorning = await getStatus(me.user, new Date('2026-10-27T14:00:00Z'));
  expect(tuesdayMorning.today.spent).toBe(0); // new day
  expect(tuesdayMorning.week.spent).toBe(8); // same week
});

test('"Send a test clink" works without saving a purchase', async () => {
  const res = await request(app).post('/api/shortcut/test').set(me.shortcut);
  expect(res.status).toBe(200);
  expect(res.body.notification).toMatch(/You're all set, Marie!/);
  expect(await Purchase.count()).toBe(0);
});

test('regenerating the shortcut token disconnects the old one', async () => {
  const old = me.shortcut;
  const res = await request(app).post('/api/shortcut/regenerate').set(me.auth);
  expect(res.body.shortcut_token).toHaveLength(48);
  const withOld = await request(app).post('/api/purchases').set(old).send({ amount: 1 });
  expect(withOld.status).toBe(401);
});

test('the dev simulator triggers the same clink from the app', async () => {
  const res = await request(app).post('/api/dev/simulate-purchase').set(me.auth).send({ amount: 6, merchant: 'Starbucks' });
  expect(res.status).toBe(201);
  expect(res.body.notification).toBe('You spent $6.00 at Starbucks · $14.00 left today · $134.00 left this week');
});
