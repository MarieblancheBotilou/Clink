// History tab: spending per day or per week compared with the budget,
// and the purchases for one day. See docs/api.md endpoints 13 and 14.
const { Op } = require('sequelize');
const { DateTime } = require('luxon');
const { Budget, Purchase } = require('../models');
const AppError = require('../utils/AppError');
const { toCents, fromCents } = require('../utils/money');
const { isValidDateString } = require('../utils/validation');

const DEFAULTS = { daily: 30, weekly: 12 }; // how many days / weeks to show if no dates are given
const MAX_DAYS = 366;

function parseDate(value, label, timezone) {
  if (!isValidDateString(value)) {
    throw new AppError(400, 'INVALID_DATE', `${label} must be a date like 2026-10-28.`);
  }
  return DateTime.fromISO(value, { zone: timezone });
}

// GET /api/history?range=daily|weekly&from=YYYY-MM-DD&to=YYYY-MM-DD
async function getHistory(user, query = {}, now = new Date()) {
  const range = query.range || 'daily';
  if (!['daily', 'weekly'].includes(range)) {
    throw new AppError(400, 'INVALID_RANGE', 'range must be "daily" or "weekly".');
  }
  const unit = range === 'daily' ? 'day' : 'week';
  const tz = user.timezone;

  // Work out the date range in the user's time zone.
  const today = DateTime.fromJSDate(now).setZone(tz);
  let end = (query.to ? parseDate(query.to, 'to', tz) : today).endOf(unit);
  let start = query.from
    ? parseDate(query.from, 'from', tz).startOf(unit)
    : end.minus({ [`${unit}s`]: DEFAULTS[range] - 1 }).startOf(unit);
  if (end > today.endOf(unit)) end = today.endOf(unit); // nothing in the future
  if (start > end) throw new AppError(400, 'INVALID_DATE', '"from" must be before "to".');
  if (end.diff(start, 'days').days > MAX_DAYS) {
    throw new AppError(400, 'RANGE_TOO_LONG', 'Choose a range of one year or less.');
  }
  // Don't show empty periods from before the account existed.
  const joined = DateTime.fromJSDate(user.createdAt).setZone(tz).startOf(unit);
  if (start < joined) start = joined;

  // One query for every purchase in the range, then group them by day or week.
  const [purchases, budgets] = await Promise.all([
    Purchase.findAll({
      where: { userId: user.id, purchasedAt: { [Op.between]: [start.toJSDate(), end.toJSDate()] } },
      attributes: ['amount', 'purchasedAt'],
    }),
    Budget.findAll({ where: { userId: user.id, isActive: true } }),
  ]);

  const spentByPeriod = new Map();
  for (const p of purchases) {
    const key = DateTime.fromJSDate(p.purchasedAt).setZone(tz).startOf(unit).toISODate();
    spentByPeriod.set(key, (spentByPeriod.get(key) || 0) + toCents(p.amount));
  }

  const weekly = budgets.find((b) => b.period === 'weekly');
  const dailyByDay = new Map(budgets.filter((b) => b.period === 'daily').map((b) => [b.dayOfWeek, b]));
  const budgetFor = (periodStart) => {
    const row = range === 'weekly' ? weekly : dailyByDay.get(periodStart.weekday - 1);
    return row ? toCents(row.amount) : null;
  };

  // Every day/week in the range, newest first, including ones with $0 spent.
  const periods = [];
  for (let cursor = end.startOf(unit); cursor >= start; cursor = cursor.minus({ [`${unit}s`]: 1 })) {
    const key = cursor.toISODate();
    const spent = spentByPeriod.get(key) || 0;
    const budget = budgetFor(cursor);
    periods.push({
      start: key,
      spent: fromCents(spent),
      budget: budget === null ? null : fromCents(budget),
      over: budget !== null && spent > budget,
    });
  }

  return { range, periods };
}

// GET /api/purchases?date=YYYY-MM-DD: what was bought on one day (tap a day in History)
async function getPurchasesForDay(user, date) {
  const day = parseDate(date, 'date', user.timezone);
  const purchases = await Purchase.findAll({
    where: {
      userId: user.id,
      purchasedAt: { [Op.between]: [day.startOf('day').toJSDate(), day.endOf('day').toJSDate()] },
    },
    order: [['purchasedAt', 'DESC']],
  });
  const totalCents = purchases.reduce((sum, p) => sum + toCents(p.amount), 0);
  return {
    date,
    total: fromCents(totalCents),
    purchases: purchases.map((p) => ({
      id: p.id,
      amount: fromCents(toCents(p.amount)),
      merchant: p.merchant,
      purchased_at: p.purchasedAt.toISOString(),
    })),
  };
}

module.exports = { getHistory, getPurchasesForDay };
