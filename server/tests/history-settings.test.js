// History (US-6), Settings, and account management.
const { app, request, sequelize, resetDatabase, signUp } = require('./helpers');
const { getHistory } = require('../src/services/historyService');
const { User, Settings, Budget, Purchase } = require('../src/models');

let me;
beforeEach(async () => {
  await resetDatabase();
  me = await signUp();
});
afterAll(() => sequelize.close());

describe('History', () => {
  // Pretend the account was made a while ago, with purchases on known dates.
  // Week of Mon Oct 19 - Sun Oct 25, 2026 and Mon Oct 26 - (now) Wed Oct 28.
  const NOW = new Date('2026-10-28T20:00:00Z'); // Wed Oct 28, 3 PM in College Station
  const buy = (amount, iso, merchant) => Purchase.create({ userId: me.user.id, amount, merchant, purchasedAt: new Date(iso) });

  beforeEach(async () => {
    await User.update({ createdAt: new Date('2026-10-01T12:00:00Z') }, { where: { id: me.user.id } });
    me.user = await User.findByPk(me.user.id);
    await request(app).put('/api/budgets').set(me.auth)
      .send({ weekly: { amount: 140 }, daily: { mode: 'same', amount: 20 } });
    await buy(6, '2026-10-28T15:00:00Z', 'Starbucks'); // Wed
    await buy(25, '2026-10-27T18:00:00Z', 'Target'); // Tue (over $20)
    await buy(8, '2026-10-27T04:30:00Z', 'Whataburger'); // Mon 11:30 PM local -> counts as Monday
    await buy(50, '2026-10-21T18:00:00Z', 'H-E-B'); // previous week
  });

  test('daily history: each day vs. its cap, newest first, $0 days included', async () => {
    const res = await getHistory(me.user, { range: 'daily', from: '2026-10-25', to: '2026-10-28' }, NOW);
    expect(res).toEqual({
      range: 'daily',
      periods: [
        { start: '2026-10-28', spent: 6, budget: 20, over: false },
        { start: '2026-10-27', spent: 25, budget: 20, over: true },
        { start: '2026-10-26', spent: 8, budget: 20, over: false },
        { start: '2026-10-25', spent: 0, budget: 20, over: false },
      ],
    });
  });

  test('weekly history groups Monday-Sunday', async () => {
    const res = await getHistory(me.user, { range: 'weekly', from: '2026-10-19', to: '2026-10-28' }, NOW);
    expect(res.periods).toEqual([
      { start: '2026-10-26', spent: 39, budget: 140, over: false },
      { start: '2026-10-19', spent: 50, budget: 140, over: false },
    ]);
  });

  test('defaults to the last 30 days, but not before the account existed', async () => {
    const res = await getHistory(me.user, {}, NOW);
    expect(res.periods[0].start).toBe('2026-10-28');
    expect(res.periods.at(-1).start).toBe('2026-10-01');
    expect(res.periods).toHaveLength(28);
  });

  test('one day\'s purchases, newest first, with a total', async () => {
    const res = await request(app).get('/api/purchases?date=2026-10-26').set(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(8);
    expect(res.body.purchases).toEqual([
      { id: expect.any(Number), amount: 8, merchant: 'Whataburger', purchased_at: '2026-10-27T04:30:00.000Z' },
    ]);
  });

  test.each([
    ['/api/history?range=monthly', 'INVALID_RANGE'],
    ['/api/history?from=2026-13-01', 'INVALID_DATE'],
    ['/api/history?from=2026-10-28&to=2026-10-01', 'INVALID_DATE'],
    ['/api/purchases?date=yesterday', 'INVALID_DATE'],
    ['/api/purchases', 'INVALID_DATE'],
  ])('rejects %s', async (url, code) => {
    const res = await request(app).get(url).set(me.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
  });

  test('only shows your own purchases', async () => {
    const other = await signUp({ email: 'other@example.com' });
    const res = await request(app).get('/api/purchases?date=2026-10-26').set(other.auth);
    expect(res.body.purchases).toEqual([]);
  });
});

describe('Settings', () => {
  test('starts with the defaults', async () => {
    const res = await request(app).get('/api/settings').set(me.auth);
    expect(res.body).toEqual({ notifications_on: true, sound_on: true, reduce_motion: false, alert_threshold_pct: 75 });
  });

  test('changes only what is sent', async () => {
    const res = await request(app).patch('/api/settings').set(me.auth).send({ sound_on: false, alert_threshold_pct: 90 });
    expect(res.body).toEqual({ notifications_on: true, sound_on: false, reduce_motion: false, alert_threshold_pct: 90 });
  });

  test('the new alert level changes when the heads-up appears', async () => {
    await request(app).put('/api/budgets').set(me.auth).send({ daily: { mode: 'same', amount: 20 } });
    await request(app).patch('/api/settings').set(me.auth).send({ alert_threshold_pct: 50 });
    const res = await request(app).post('/api/purchases').set(me.shortcut).send({ amount: 10 });
    expect(res.body.alerts).toEqual(['daily_heads_up']);
  });

  test.each([
    [{ sound_on: 'yes' }, 'INVALID_INPUT'],
    [{ alert_threshold_pct: 100 }, 'INVALID_INPUT'],
    [{ alert_threshold_pct: 50.5 }, 'INVALID_INPUT'],
    [{ dark_mode: true }, 'UNKNOWN_SETTING'],
    [{}, 'INVALID_INPUT'],
  ])('rejects %p', async (body, code) => {
    const res = await request(app).patch('/api/settings').set(me.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
  });
});

describe('Account', () => {
  test('updates name and time zone', async () => {
    const res = await request(app).patch('/api/me').set(me.auth).send({ name: 'Marie-Blanche', timezone: 'America/New_York' });
    expect(res.body.user).toMatchObject({ name: 'Marie-Blanche', timezone: 'America/New_York' });
  });

  test('rejects a bad time zone', async () => {
    const res = await request(app).patch('/api/me').set(me.auth).send({ timezone: 'Nowhere/Land' });
    expect(res.body.error.code).toBe('INVALID_TIMEZONE');
  });

  test('deleting the account needs the password', async () => {
    const res = await request(app).delete('/api/me').set(me.auth).send({ password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(await User.count()).toBe(1);
  });

  test('deleting the account removes all of its data', async () => {
    await request(app).put('/api/budgets').set(me.auth).send({ weekly: { amount: 100 } });
    await request(app).post('/api/purchases').set(me.shortcut).send({ amount: 5 });

    const res = await request(app).delete('/api/me').set(me.auth).send({ password: 'supersecret1' });
    expect(res.status).toBe(204);
    expect(await User.count()).toBe(0);
    expect(await Settings.count()).toBe(0);
    expect(await Budget.count()).toBe(0);
    expect(await Purchase.count()).toBe(0);

    const after = await request(app).get('/api/me').set(me.auth);
    expect(after.status).toBe(401); // the old login token no longer works
  });
});
