// The heart of Clink: what did you spend, what's left, and what should the
// notification say? Used by the Home screen (/api/status) and by the clink
// (POST /api/purchases). See docs/api.md endpoints 8 and 9.
const { Op } = require('sequelize');
const { Budget, Purchase, Settings } = require('../models');
const AppError = require('../utils/AppError');
const { toCents, fromCents, formatCents } = require('../utils/money');
const { getPeriods } = require('../utils/periods');

const JAR_STAGES = 6; // matches the six jar drawings: 6 = full ... 1 = almost empty, 0 = empty/over

async function sumCents(userId, start, end) {
  const total = await Purchase.sum('amount', {
    where: { userId, purchasedAt: { [Op.between]: [start, end] } },
  });
  return toCents(total) || 0; // sum() returns null when there are no purchases
}

function jarStage(capCents, remainingCents) {
  if (remainingCents <= 0) return 0;
  return Math.min(JAR_STAGES, Math.max(1, Math.ceil((remainingCents / capCents) * JAR_STAGES)));
}

// One budget's numbers, e.g. today's: cap $20, spent $14 -> $6 left, 70% used.
function summarize(capCents, spentCents, extraKey) {
  const remaining = capCents - spentCents;
  return {
    [extraKey]: fromCents(capCents),
    spent: fromCents(spentCents),
    remaining: fromCents(remaining),
    percent_used: Math.round((spentCents / capCents) * 100),
    jar_stage: jarStage(capCents, remaining),
  };
}

function alertsFor(summary, thresholdPct, prefix) {
  if (!summary) return [];
  if (summary.percent_used >= 100) return [`${prefix}_limit`];
  if (summary.percent_used >= thresholdPct) return [`${prefix}_heads_up`];
  return [];
}

// GET /api/status (and reused after every purchase)
async function getStatus(user, now = new Date()) {
  const p = getPeriods(user.timezone, now);
  const [budgets, settings] = await Promise.all([
    Budget.findAll({ where: { userId: user.id, isActive: true } }),
    Settings.findOne({ where: { userId: user.id } }),
  ]);
  const weeklyRow = budgets.find((b) => b.period === 'weekly');
  const todayRow = budgets.find((b) => b.period === 'daily' && b.dayOfWeek === p.dayOfWeek);

  const [spentToday, spentWeek] = await Promise.all([
    sumCents(user.id, p.dayStart, p.dayEnd),
    sumCents(user.id, p.weekStart, p.weekEnd),
  ]);

  const today = todayRow ? summarize(toCents(todayRow.amount), spentToday, 'cap') : null;
  const week = weeklyRow ? summarize(toCents(weeklyRow.amount), spentWeek, 'budget') : null;
  const threshold = settings ? settings.alertThresholdPct : 75;

  return {
    today,
    week,
    spent_today: fromCents(spentToday),
    spent_this_week: fromCents(spentWeek),
    jar: today ? 'today' : week ? 'week' : null, // the jar shows today; falls back to the week if daily caps are off
    alerts: [...alertsFor(today, threshold, 'daily'), ...alertsFor(week, threshold, 'weekly')],
  };
}

function leftText(remaining, label) {
  const cents = Math.round(remaining * 100);
  return cents < 0 ? `${formatCents(cents)} over ${label}` : `${formatCents(cents)} left ${label}`;
}

// Builds the words the user sees after a purchase.
function buildNotification(purchase, status) {
  const spent = `You spent ${formatCents(toCents(purchase.amount))}${purchase.merchant ? ` at ${purchase.merchant}` : ''}`;
  const { today, week, alerts } = status;
  const parts = [];
  if (today) parts.push(leftText(today.remaining, 'today'));
  if (week) parts.push(leftText(week.remaining, 'this week'));

  if (alerts.includes('weekly_limit')) {
    return `You've reached this week's limit · ${spent} · ${leftText(week.remaining, 'this week')}. Check your bank app.`;
  }
  if (alerts.includes('daily_limit')) {
    return `You've reached today's limit · ${spent} · ${parts.join(' · ')}. Check your bank app.`;
  }
  const headsUp = alerts.some((a) => a.endsWith('heads_up')) ? 'Heads up: ' : '';
  return [`${headsUp}${spent}`, ...parts].join(' · ');
}

function parsePurchasedAt(value, now) {
  if (value === undefined || value === null || value === '') return now;
  const date = new Date(value);
  const FIVE_MINUTES = 5 * 60 * 1000;
  if (Number.isNaN(date.getTime()) || date.getTime() > now.getTime() + FIVE_MINUTES) {
    throw new AppError(400, 'INVALID_DATE', 'purchased_at must be a valid date that is not in the future.');
  }
  return date;
}

// Saves a purchase and returns what the shortcut should show and play.
async function recordPurchase(user, body, now = new Date()) {
  const { amount, merchant, purchased_at: purchasedAtInput } = body || {};

  const cents = toCents(amount);
  if (cents === null) throw new AppError(400, 'INVALID_AMOUNT', 'Amount must be greater than $0.');

  const cleanMerchant = typeof merchant === 'string' && merchant.trim() ? merchant.trim().slice(0, 100) : null;
  const purchasedAt = parsePurchasedAt(purchasedAtInput, now);

  const purchase = await Purchase.create({
    userId: user.id,
    amount: fromCents(cents),
    merchant: cleanMerchant,
    purchasedAt,
  });

  const [status, settings] = await Promise.all([
    getStatus(user, now),
    Settings.findOne({ where: { userId: user.id } }),
  ]);

  return {
    purchase: {
      id: purchase.id,
      amount: fromCents(cents),
      merchant: cleanMerchant,
      purchased_at: purchasedAt.toISOString(),
    },
    notification: buildNotification({ amount: fromCents(cents), merchant: cleanMerchant }, status),
    today_remaining: status.today ? status.today.remaining : null,
    week_remaining: status.week ? status.week.remaining : null,
    alerts: status.alerts,
    show_notification: settings ? settings.notificationsOn : true,
    play_sound: settings ? settings.soundOn : true,
  };
}

module.exports = { getStatus, recordPurchase, buildNotification };
