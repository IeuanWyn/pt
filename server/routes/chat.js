const express = require('express');
const router = express.Router();
const { chat, clearHistory } = require('../services/claude');
const { query } = require('../services/db');
const { fetchLinkTitle, extractUrls } = require('../services/linkTitle');

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

    const rawMessage = message.trim();

    // Enrich any URLs in the message with their article titles so Claude has
    // full context. We store the original message in history but send the
    // enriched version to the model.
    let enrichedMessage = rawMessage;
    const urls = extractUrls(rawMessage);
    for (const url of urls.slice(0, 3)) {
      const title = await fetchLinkTitle(url);
      if (title) {
        enrichedMessage = enrichedMessage.replace(url, `${url} [Article: "${title}"]`);
      }
    }

    const response = await chat(enrichedMessage, rawMessage);
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
