const axios = require('axios');
const { query } = require('./db');

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

async function getTokens() {
  const rows = await query('SELECT * FROM strava_tokens WHERE id = 1');
  return rows[0] || null;
}

async function saveTokens(accessToken, refreshToken, expiresAt, athleteId, athleteName) {
  await query(`
    INSERT INTO strava_tokens (id, access_token, refresh_token, expires_at, athlete_id, athlete_name)
    VALUES (1, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      access_token = VALUES(access_token),
      refresh_token = VALUES(refresh_token),
      expires_at = VALUES(expires_at),
      athlete_id = VALUES(athlete_id),
      athlete_name = VALUES(athlete_name)
  `, [accessToken, refreshToken, expiresAt, athleteId, athleteName]);
}

async function refreshTokenIfNeeded(tokens) {
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > now + 60) {
    return tokens;
  }

  try {
    const res = await axios.post(STRAVA_TOKEN_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    });

    const { access_token, refresh_token, expires_at } = res.data;
    await saveTokens(access_token, refresh_token, expires_at, tokens.athlete_id, tokens.athlete_name);
    return { ...tokens, access_token, refresh_token, expires_at };
  } catch (err) {
    console.error('Failed to refresh Strava token:', err.message);
    throw new Error('Strava token refresh failed');
  }
}

async function getValidToken() {
  const tokens = await getTokens();
  if (!tokens) return null;
  return await refreshTokenIfNeeded(tokens);
}

function mapActivityType(stravaType) {
  const typeMap = {
    Run: 'run',
    VirtualRun: 'run',
    TrailRun: 'run',
    VirtualRide: 'zwift',
    Ride: 'cycling',
    Walk: 'walk',
    Hike: 'walk',
  };
  return typeMap[stravaType] || 'activity';
}

async function syncActivities() {
  const tokens = await getValidToken();
  if (!tokens) throw new Error('Strava not connected');

  const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

  let page = 1;
  let allActivities = [];
  let rateLimited = false;

  while (true) {
    try {
      const res = await axios.get(`${STRAVA_API}/athlete/activities`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        params: { after: ninetyDaysAgo, per_page: 100, page },
      });

      const activities = res.data;
      if (!activities.length) break;
      allActivities = allActivities.concat(activities);
      if (activities.length < 100) break;
      page++;
    } catch (err) {
      if (err.response?.status === 429) {
        rateLimited = true;
        break;
      }
      throw err;
    }
  }

  let synced = 0;
  let skipped = 0;

  for (const act of allActivities) {
    const actType = mapActivityType(act.type);
    const distanceKm = act.distance ? act.distance / 1000 : null;
    const durationSec = act.moving_time || null;
    const avgHr = act.average_heartrate ? Math.round(act.average_heartrate) : null;
    const actDate = act.start_date_local ? act.start_date_local.substring(0, 10) : null;

    try {
      const result = await query(`
        INSERT INTO session_log
          (session_date, activity_type, distance_km, duration_seconds, avg_hr,
           strava_id, strava_name, is_strava_synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          session_date = VALUES(session_date),
          activity_type = VALUES(activity_type),
          distance_km = VALUES(distance_km),
          duration_seconds = VALUES(duration_seconds),
          avg_hr = VALUES(avg_hr),
          strava_name = VALUES(strava_name)
      `, [actDate, actType, distanceKm, durationSec, avgHr, act.id, act.name]);

      if (result.affectedRows === 1) synced++;
      else skipped++;
    } catch (err) {
      console.error('Error inserting activity:', act.id, err.message);
    }
  }

  return { synced, skipped, total: allActivities.length, rateLimited };
}

async function exchangeCode(code) {
  const res = await axios.post(STRAVA_TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  });

  const { access_token, refresh_token, expires_at, athlete } = res.data;
  const athleteName = `${athlete.firstname} ${athlete.lastname}`;
  await saveTokens(access_token, refresh_token, expires_at, athlete.id, athleteName);
  return { athlete, access_token };
}

async function disconnect() {
  await query('DELETE FROM strava_tokens WHERE id = 1');
}

module.exports = { getValidToken, syncActivities, exchangeCode, disconnect, getTokens };
