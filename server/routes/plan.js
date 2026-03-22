const express = require('express');
const router = express.Router();
const { query } = require('../services/db');

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM user_profile WHERE id = 1');
    if (rows.length === 0) {
      return res.json({ exists: false });
    }
    res.json({ exists: true, profile: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save / update user profile
router.post('/profile', async (req, res) => {
  try {
    const {
      name, dob, weight_stones, weight_lbs, height_feet, height_inches,
      injury_notes, running_experience, longest_distance_km,
      previous_5k, previous_10k, goal_event_name, target_race_date,
      location, zwift_username,
    } = req.body;

    await query(`
      INSERT INTO user_profile
        (id, name, dob, weight_stones, weight_lbs, height_feet, height_inches,
         injury_notes, running_experience, longest_distance_km, previous_5k,
         previous_10k, goal_event_name, target_race_date, location, zwift_username,
         onboarding_complete)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        dob = VALUES(dob),
        weight_stones = VALUES(weight_stones),
        weight_lbs = VALUES(weight_lbs),
        height_feet = VALUES(height_feet),
        height_inches = VALUES(height_inches),
        injury_notes = VALUES(injury_notes),
        running_experience = VALUES(running_experience),
        longest_distance_km = VALUES(longest_distance_km),
        previous_5k = VALUES(previous_5k),
        previous_10k = VALUES(previous_10k),
        goal_event_name = VALUES(goal_event_name),
        target_race_date = VALUES(target_race_date),
        location = VALUES(location),
        zwift_username = VALUES(zwift_username),
        onboarding_complete = TRUE
    `, [name, dob, weight_stones, weight_lbs, height_feet, height_inches,
        injury_notes, running_experience, longest_distance_km,
        previous_5k ? 1 : 0, previous_10k ? 1 : 0, goal_event_name,
        target_race_date, location, zwift_username]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get week progress
router.get('/progress', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM week_progress ORDER BY phase, week_number');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark week as complete
router.post('/progress', async (req, res) => {
  try {
    const { phase, week_number, completed, notes } = req.body;
    await query(`
      INSERT INTO week_progress (phase, week_number, completed, completed_at, notes)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        completed = VALUES(completed),
        completed_at = IF(VALUES(completed) = TRUE, NOW(), NULL),
        notes = VALUES(notes)
    `, [phase, week_number, completed ? 1 : 0, completed ? new Date() : null, notes]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notes / checklist items
router.get('/notes', async (req, res) => {
  try {
    const { type } = req.query;
    let rows;
    if (type) {
      rows = await query('SELECT * FROM notes WHERE note_type = ? ORDER BY id', [type]);
    } else {
      rows = await query('SELECT * FROM notes ORDER BY note_type, id');
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save note / checklist item
router.post('/notes', async (req, res) => {
  try {
    const { note_type, note_key, note_value, completed } = req.body;
    await query(`
      INSERT INTO notes (note_type, note_key, note_value, completed)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        note_value = VALUES(note_value),
        completed = VALUES(completed)
    `, [note_type, note_key, note_value, completed ? 1 : 0]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
