require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { initDB } = require('./services/db');
const { syncActivities } = require('./services/strava');
const { getTokens } = require('./services/strava');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/,
  ],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/strava', require('./routes/strava'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/chat', require('./routes/chat'));

// Clear all data endpoint
app.delete('/api/data/all', async (req, res) => {
  try {
    const { query } = require('./services/db');
    await query('DELETE FROM session_log');
    await query('DELETE FROM week_progress');
    await query('DELETE FROM notes');
    await query('DELETE FROM chat_history');
    await query('DELETE FROM strava_tokens');
    await query('DELETE FROM user_profile');
    res.json({ success: true, message: 'All data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await initDB();
    console.log('Database initialised');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Auto-sync Strava on startup if connected
    try {
      const tokens = await getTokens();
      if (tokens) {
        console.log('Auto-syncing Strava activities...');
        const result = await syncActivities();
        console.log(`Auto-sync complete: ${result.synced} new, ${result.skipped} existing`);
      }
    } catch (err) {
      console.warn('Auto-sync failed (non-fatal):', err.message);
    }
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
