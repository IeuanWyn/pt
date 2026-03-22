const express = require('express');
const router = express.Router();
const { exchangeCode } = require('../services/strava');

// Strava OAuth callback
router.get('/strava/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?strava_error=${error}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const { athlete } = await exchangeCode(code);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?strava_connected=true&athlete=${encodeURIComponent(athlete.firstname)}`);
  } catch (err) {
    console.error('Strava OAuth error:', err.message);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?strava_error=oauth_failed`);
  }
});

module.exports = router;
