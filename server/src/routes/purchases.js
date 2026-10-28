// The clink: the Apple Pay shortcut reports a purchase. See docs/api.md endpoint 9.
const express = require('express');
const requireShortcut = require('../middleware/requireShortcut');
const { recordPurchase } = require('../services/spendingService');

const router = express.Router();

// POST /api/purchases
router.post('/', requireShortcut, async (req, res) => {
  res.status(201).json(await recordPurchase(req.user, req.body));
});

module.exports = router;
