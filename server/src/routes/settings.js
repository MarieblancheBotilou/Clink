// The Settings tab. See docs/api.md endpoints 15 and 16.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const AppError = require('../utils/AppError');
const { Settings } = require('../models');

const router = express.Router();
router.use(requireAuth);

// API names (snake_case) -> model fields (camelCase), and what type each must be
const FIELDS = {
  notifications_on: { field: 'notificationsOn', type: 'boolean' },
  sound_on: { field: 'soundOn', type: 'boolean' },
  reduce_motion: { field: 'reduceMotion', type: 'boolean' },
  alert_threshold_pct: { field: 'alertThresholdPct', type: 'percent' },
};

function toResponse(settings) {
  return Object.fromEntries(Object.entries(FIELDS).map(([key, { field }]) => [key, settings[field]]));
}

async function findSettings(userId) {
  // Every user gets settings at sign-up; this just covers older or broken accounts.
  const [settings] = await Settings.findOrCreate({ where: { userId } });
  return settings;
}

// GET /api/settings
router.get('/', async (req, res) => {
  res.json(toResponse(await findSettings(req.user.id)));
});

// PATCH /api/settings: change only the settings that are sent
router.patch('/', async (req, res) => {
  const body = req.body || {};
  const keys = Object.keys(body);
  if (keys.length === 0) throw new AppError(400, 'INVALID_INPUT', 'Send at least one setting to change.');

  const changes = {};
  for (const key of keys) {
    const spec = FIELDS[key];
    if (!spec) throw new AppError(400, 'UNKNOWN_SETTING', `"${key}" is not a setting.`);
    const value = body[key];
    if (spec.type === 'boolean' && typeof value !== 'boolean') {
      throw new AppError(400, 'INVALID_INPUT', `${key} must be true or false.`);
    }
    if (spec.type === 'percent' && !(Number.isInteger(value) && value >= 1 && value <= 99)) {
      throw new AppError(400, 'INVALID_INPUT', `${key} must be a whole number from 1 to 99.`);
    }
    changes[spec.field] = value;
  }

  const settings = await findSettings(req.user.id);
  await settings.update(changes);
  res.json(toResponse(settings));
});

module.exports = router;
