const express = require('express');
const router = express.Router();
const { chat, clearHistory } = require('../services/claude');
const { query } = require('../services/db');

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, role, content, created_at
      FROM chat_history
      ORDER BY created_at ASC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await chat(message.trim());
    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to get response from coach. Please try again.' });
  }
});

// Clear chat history
router.delete('/history', async (req, res) => {
  try {
    await clearHistory();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
