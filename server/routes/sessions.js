const express = require('express');
const router = express.Router();
const { query } = require('../services/db');

// Get all sessions with optional filters
router.get('/', async (req, res) => {
  try {
    const { type, from, to, limit } = req.query;
    let sql = 'SELECT * FROM session_log WHERE 1=1';
    const params = [];

    if (type && type !== 'all') {
      sql += ' AND activity_type = ?';
      params.push(type);
    }
    if (from) {
      sql += ' AND session_date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND session_date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY session_date DESC, id DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log a manual session
router.post('/', async (req, res) => {
  try {
    const { session_date, activity_type, distance_km, duration_seconds, avg_hr, calf_feel, notes } = req.body;

    if (!session_date || !activity_type) {
      return res.status(400).json({ error: 'session_date and activity_type are required' });
    }

    const result = await query(`
      INSERT INTO session_log
        (session_date, activity_type, distance_km, duration_seconds, avg_hr, calf_feel, notes, is_strava_synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
    `, [session_date, activity_type, distance_km || null, duration_seconds || null,
        avg_hr || null, calf_feel || null, notes || null]);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a session
router.put('/:id', async (req, res) => {
  try {
    const { calf_feel, notes } = req.body;
    const { id } = req.params;

    await query(`
      UPDATE session_log SET calf_feel = ?, notes = ? WHERE id = ?
    `, [calf_feel || null, notes || null, id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a session (manual only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM session_log WHERE id = ? AND is_strava_synced = FALSE', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get personal bests
router.get('/personal-bests', async (req, res) => {
  try {
    const longestRun = await query(`
      SELECT * FROM session_log
      WHERE activity_type = 'run' AND distance_km IS NOT NULL
      ORDER BY distance_km DESC LIMIT 1
    `);

    const firstRun = await query(`
      SELECT * FROM session_log
      WHERE activity_type = 'run'
      ORDER BY session_date ASC LIMIT 1
    `);

    const longestDuration = await query(`
      SELECT * FROM session_log
      WHERE activity_type = 'run' AND duration_seconds IS NOT NULL
      ORDER BY duration_seconds DESC LIMIT 1
    `);

    res.json({
      longest_run: longestRun[0] || null,
      first_run: firstRun[0] || null,
      longest_duration: longestDuration[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stats summary
router.get('/stats', async (req, res) => {
  try {
    const total = await query('SELECT COUNT(*) as count FROM session_log');
    const byType = await query(`
      SELECT activity_type, COUNT(*) as count, SUM(distance_km) as total_km
      FROM session_log GROUP BY activity_type
    `);
    const recentRuns = await query(`
      SELECT * FROM session_log WHERE activity_type = 'run'
      ORDER BY session_date DESC LIMIT 5
    `);

    res.json({
      total_sessions: total[0].count,
      by_type: byType,
      recent_runs: recentRuns,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
