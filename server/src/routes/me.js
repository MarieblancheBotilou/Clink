// The logged-in user's own account. See docs/api.md endpoints 3-5.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth); // every route below needs a login token

// GET /api/me
router.get('/', (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

module.exports = router;
