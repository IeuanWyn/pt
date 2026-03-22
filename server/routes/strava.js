const express = require('express');
const router = express.Router();
const { getTokens, syncActivities, disconnect, getValidToken } = require('../services/strava');

// Get Strava connection status
router.get('/status', async (req, res) => {
  try {
    const tokens = await getTokens();
    if (!tokens) {
      return res.json({ connected: false });
    }

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI)}&approval_prompt=force&scope=read,activity:read_all`;

    res.json({
      connected: true,
      athlete_name: tokens.athlete_name,
      athlete_id: tokens.athlete_id,
      authUrl,
    });
  } catch (err) {
    console.error('Strava status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get Strava auth URL
router.get('/auth-url', (req, res) => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI)}&approval_prompt=force&scope=read,activity:read_all`;
  res.json({ url: authUrl });
});

// Sync Strava activities
router.post('/sync', async (req, res) => {
  try {
    const result = await syncActivities();

    if (result.rateLimited) {
      return res.status(429).json({
        error: 'Strava rate limit reached. Please wait a few minutes and try again.',
        synced: result.synced,
        skipped: result.skipped,
      });
    }

    res.json({
      message: `Synced ${result.synced} new activities, ${result.skipped} already existed.`,
      synced: result.synced,
      skipped: result.skipped,
      total: result.total,
    });
  } catch (err) {
    console.error('Strava sync error:', err.message);
    if (err.message === 'Strava not connected') {
      return res.status(400).json({ error: 'Strava is not connected. Please connect first.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Disconnect Strava
router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ message: 'Strava disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
