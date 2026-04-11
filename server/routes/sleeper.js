const express = require('express');
const { query } = require('../services/db');

const router = express.Router();

// GET /api/sleeper/status
router.get('/status', async (req, res) => {
  try {
    const rows = await query('SELECT league_id, user_id FROM sleeper_credentials WHERE id = 1');
    if (rows[0]?.league_id) {
      res.json({ connected: true, league_id: rows[0].league_id, user_id: rows[0].user_id });
    } else {
      res.json({ connected: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sleeper/save  { league_id, user_id }
router.post('/save', async (req, res) => {
  const { league_id, user_id } = req.body;
  if (!league_id || !user_id) {
    return res.status(400).json({ error: 'league_id and user_id are required' });
  }
  try {
    await query(
      `INSERT INTO sleeper_credentials (id, league_id, user_id)
       VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE league_id = VALUES(league_id), user_id = VALUES(user_id)`,
      [league_id.trim(), user_id.trim()]
    );
    res.json({ success: true, message: 'Sleeper credentials saved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sleeper/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    await query('DELETE FROM sleeper_credentials WHERE id = 1');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
