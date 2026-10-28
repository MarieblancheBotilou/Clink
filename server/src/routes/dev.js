// Development-only helpers. Never available in production.
// Lets you (and reviewers without an iPhone) trigger a clink from the app.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { recordPurchase } = require('../services/spendingService');

const router = express.Router();

// POST /api/dev/simulate-purchase  { "amount": 6, "merchant": "Starbucks" }
router.post('/simulate-purchase', requireAuth, async (req, res) => {
  res.status(201).json(await recordPurchase(req.user, req.body));
});

module.exports = router;
