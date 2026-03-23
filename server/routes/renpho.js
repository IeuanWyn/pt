const express = require('express');
const { syncMeasurements, getStatus, disconnect, encryptPassword, saveCredentials } = require('../services/renpho');

const router = express.Router();

// GET /api/renpho/status
router.get('/status', async (req, res) => {
  try {
    const status = await getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/renpho/connect  { email, password }
router.post('/connect', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    // Store credentials (password obfuscated) and attempt first sync
    await saveCredentials({
      email,
      passwordEnc: encryptPassword(password),
      sessionKey: null,
      userId: null,
    });
    const result = await syncMeasurements(email, password);
    res.json({
      success: true,
      message: `Connected and synced ${result.imported} measurement${result.imported !== 1 ? 's' : ''}.`,
      ...result,
    });
  } catch (err) {
    console.error('Renpho connect error:', err.message);
    res.status(401).json({ error: err.message });
  }
});

// POST /api/renpho/sync  — re-sync using stored credentials
router.post('/sync', async (req, res) => {
  try {
    const status = await getStatus();
    if (!status.connected) {
      return res.status(400).json({ error: 'Renpho not connected. Please connect first.' });
    }

    const { query } = require('../services/db');
    const rows = await query('SELECT email, password_enc FROM renpho_credentials WHERE id = 1');
    if (!rows[0]?.password_enc) {
      return res.status(400).json({ error: 'No stored credentials. Please reconnect.' });
    }

    const { decryptPassword } = require('../services/renpho');
    const password = decryptPassword(rows[0].password_enc);
    const result = await syncMeasurements(rows[0].email, password);

    res.json({
      success: true,
      message: `Synced ${result.imported} new measurement${result.imported !== 1 ? 's' : ''} (${result.skipped} already existed).`,
      ...result,
    });
  } catch (err) {
    console.error('Renpho sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/renpho/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
