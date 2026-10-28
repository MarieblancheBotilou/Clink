// Purchases: the clink (shortcut reports a purchase) and one day's list for History.
// See docs/api.md endpoints 9 and 14.
const express = require('express');
const requireShortcut = require('../middleware/requireShortcut');
const requireAuth = require('../middleware/requireAuth');
const AppError = require('../utils/AppError');
const { recordPurchase } = require('../services/spendingService');
const { getPurchasesForDay } = require('../services/historyService');

const router = express.Router();

// POST /api/purchases
router.post('/', requireShortcut, async (req, res) => {
  res.status(201).json(await recordPurchase(req.user, req.body));
});

// GET /api/purchases?date=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  if (!req.query.date) throw new AppError(400, 'INVALID_DATE', 'Add ?date=YYYY-MM-DD.');
  res.json(await getPurchasesForDay(req.user, req.query.date));
});

module.exports = router;
