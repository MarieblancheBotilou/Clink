// History tab. See docs/api.md endpoint 13.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getHistory } = require('../services/historyService');

const router = express.Router();

// GET /api/history?range=daily|weekly&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  res.json(await getHistory(req.user, req.query));
});

module.exports = router;
