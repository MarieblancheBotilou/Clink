// Setting up the Clink shortcut. See docs/api.md endpoints 10-12.
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireShortcut = require('../middleware/requireShortcut');
const { createShortcutToken } = require('../utils/tokens');

const router = express.Router();

// GET /api/shortcut: the token the user pastes into their shortcut during setup
router.get('/', requireAuth, (req, res) => {
  res.json({ shortcut_token: req.user.shortcutToken });
});

// POST /api/shortcut/regenerate: replace the token if it was ever shared by accident
router.post('/regenerate', requireAuth, async (req, res) => {
  req.user.shortcutToken = createShortcutToken();
  await req.user.save();
  res.json({ shortcut_token: req.user.shortcutToken });
});

// POST /api/shortcut/test: "Send a test clink" (nothing is saved)
router.post('/test', requireShortcut, (req, res) => {
  res.json({
    notification: `You're all set, ${req.user.name}! You'll hear a clink after every Apple Pay purchase.`,
    play_sound: true,
  });
});

module.exports = router;
