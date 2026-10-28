// The Home screen: today's cap (the jar), this week, and any alerts. See docs/api.md endpoint 8.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getStatus } = require('../services/spendingService');

const router = express.Router();

// GET /api/status
router.get('/', requireAuth, async (req, res) => {
  res.json(await getStatus(req.user));
});

module.exports = router;
