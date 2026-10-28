// Reading and saving a user's budgets: one weekly budget (the overall limit)
// and seven daily caps that must fit inside it. See docs/decision-log.md (11:33 AM).
const { sequelize, Budget } = require('../models');
const AppError = require('../utils/AppError');
const { toCents, fromCents, formatCents } = require('../utils/money');

const DAYS = 7;

// Database rows -> the shape the app uses:
// { weekly: { amount, is_active } | null, daily: { is_active, mode, amounts[7] } | null }
function toResponse(rows) {
  const weeklyRow = rows.find((r) => r.period === 'weekly');
  const dailyRows = rows.filter((r) => r.period === 'daily').sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  let daily = null;
  if (dailyRows.length === DAYS) {
    const amounts = dailyRows.map((r) => fromCents(toCents(r.amount)));
    daily = {
      is_active: dailyRows.every((r) => r.isActive),
      mode: amounts.every((a) => a === amounts[0]) ? 'same' : 'per_day',
      amounts, // Monday first
    };
  }

  return {
    weekly: weeklyRow ? { amount: fromCents(toCents(weeklyRow.amount)), is_active: weeklyRow.isActive } : null,
    daily,
  };
}

async function getBudgets(userId) {
  return toResponse(await Budget.findAll({ where: { userId } }));
}

function parseActive(value, fallback = true) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new AppError(400, 'INVALID_INPUT', 'is_active must be true or false.');
  return value;
}

function invalidAmount(label) {
  return new AppError(400, 'INVALID_AMOUNT', `${label} must be a number greater than $0.`);
}

// Checks the request and turns it into cents. Throws a friendly error if anything is off.
function parseRequest(body) {
  const { weekly, daily } = body || {};
  if (!weekly && !daily) {
    throw new AppError(400, 'INVALID_INPUT', 'Send a weekly budget, daily caps, or both.');
  }

  const parsed = {};
  if (weekly) {
    const cents = toCents(weekly.amount);
    if (cents === null) throw invalidAmount('Weekly budget');
    parsed.weekly = { cents, isActive: parseActive(weekly.is_active) };
  }

  if (daily) {
    let centsPerDay;
    if (daily.mode === 'same') {
      const cents = toCents(daily.amount);
      if (cents === null) throw invalidAmount('Daily cap');
      centsPerDay = Array(DAYS).fill(cents);
    } else if (daily.mode === 'per_day') {
      if (!Array.isArray(daily.amounts) || daily.amounts.length !== DAYS) {
        throw new AppError(400, 'INVALID_INPUT', 'Send 7 daily amounts, Monday through Sunday.');
      }
      centsPerDay = daily.amounts.map(toCents);
      if (centsPerDay.includes(null)) throw invalidAmount('Each daily cap');
    } else {
      throw new AppError(400, 'INVALID_INPUT', 'Daily mode must be "same" or "per_day".');
    }
    parsed.daily = { centsPerDay, isActive: parseActive(daily.is_active) };
  }

  return parsed;
}

// PUT /api/budgets
async function saveBudgets(userId, body) {
  const incoming = parseRequest(body);
  const existing = await getBudgets(userId);

  // Combine what was sent with what's already saved, so we can check the rule
  // "when both are on, the daily caps must fit inside the weekly budget".
  const weekly = incoming.weekly || (existing.weekly && {
    cents: toCents(existing.weekly.amount),
    isActive: existing.weekly.is_active,
  });
  const daily = incoming.daily || (existing.daily && {
    centsPerDay: existing.daily.amounts.map(toCents),
    isActive: existing.daily.is_active,
  });

  if (weekly && daily && weekly.isActive && daily.isActive) {
    const dailyTotal = daily.centsPerDay.reduce((sum, c) => sum + c, 0);
    if (dailyTotal > weekly.cents) {
      throw new AppError(
        400,
        'DAILY_EXCEEDS_WEEKLY',
        `Your daily caps add up to ${formatCents(dailyTotal)}, which is more than your ${formatCents(weekly.cents)} weekly budget.`
      );
    }
  }

  // Save everything together: if any part fails, nothing is saved.
  await sequelize.transaction(async (transaction) => {
    if (incoming.weekly) {
      const [row] = await Budget.findOrBuild({ where: { userId, period: 'weekly' }, transaction });
      row.amount = fromCents(incoming.weekly.cents);
      row.isActive = incoming.weekly.isActive;
      await row.save({ transaction });
    }
    if (incoming.daily) {
      for (let day = 0; day < DAYS; day += 1) {
        const [row] = await Budget.findOrBuild({ where: { userId, period: 'daily', dayOfWeek: day }, transaction });
        row.amount = fromCents(incoming.daily.centsPerDay[day]);
        row.isActive = incoming.daily.isActive;
        await row.save({ transaction });
      }
    }
  });

  return getBudgets(userId);
}

module.exports = { getBudgets, saveBudgets };
