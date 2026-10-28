// Weekly budget + daily caps. See docs/api.md endpoints 6 and 7.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getBudgets, saveBudgets } = require('../services/budgetService');

const router = express.Router();
router.use(requireAuth);

// GET /api/budgets
router.get('/', async (req, res) => {
  res.json(await getBudgets(req.user.id));
});

// PUT /api/budgets
router.put('/', async (req, res) => {
  res.json(await saveBudgets(req.user.id, req.body));
});

module.exports = router;
