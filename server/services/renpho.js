// Renpho cloud API client
// Based on reverse-engineering documented at https://neilgaryallen.dev/blog/reverse-engineering-the-renpho-app
// and the hass-renpho open-source integration.
//
// ⚠️  WARNING: Logging in via this API will log you out of the Renpho mobile app.
//     The app and this integration cannot hold sessions simultaneously.
//     Re-syncing here will log the app out again; re-opening the app will expire this session.

const axios = require('axios');
const crypto = require('crypto');
const { query } = require('./db');

const BASE = 'https://renpho.qnclouds.com';
const APP_ID = 'Renpho';

// ── Credential storage ────────────────────────────────────────────────────────

async function getCredentials() {
  const rows = await query('SELECT * FROM renpho_credentials WHERE id = 1');
  return rows[0] || null;
}

async function saveCredentials({ email, passwordEnc, sessionKey, userId }) {
  await query(
    `INSERT INTO renpho_credentials (id, email, password_enc, session_key, renpho_user_id)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email         = VALUES(email),
       password_enc  = COALESCE(VALUES(password_enc), password_enc),
       session_key   = COALESCE(VALUES(session_key),  session_key),
       renpho_user_id = COALESCE(VALUES(renpho_user_id), renpho_user_id)`,
    [email, passwordEnc || null, sessionKey || null, userId || null]
  );
}

async function clearCredentials() {
  await query('DELETE FROM renpho_credentials WHERE id = 1');
}

// Simple reversible encoding so we don't store plaintext in the DB.
// This is NOT strong encryption — it's obfuscation for a self-hosted personal app.
const CIPHER_KEY = 'renpho-local-app-key-32-bytes!!!'; // 32 bytes for AES-256
function encryptPassword(plain) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(CIPHER_KEY), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}
function decryptPassword(enc) {
  const [ivHex, dataHex] = enc.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(CIPHER_KEY), Buffer.from(ivHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

// ── Authentication ────────────────────────────────────────────────────────────

// Renpho hashes the password before sending. MD5 is the confirmed method used
// by the community implementations (pycryptodome dependency in hass-renpho is for
// other optional features; the core auth uses MD5).
function hashPassword(plain) {
  return crypto.createHash('md5').update(plain).digest('hex');
}

async function authenticate(email, password) {
  const hashed = hashPassword(password);
  const params = new URLSearchParams({
    email,
    password: hashed,
    secure_flag: '1',
  });

  let res;
  try {
    res = await axios.post(
      `${BASE}/api/v3/users/sign_in.json?app_id=${APP_ID}`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );
  } catch (err) {
    // Some accounts work with plain-text password — try as fallback
    if (err.response?.status === 401 || err.response?.status === 403) {
      const plainParams = new URLSearchParams({ email, password, secure_flag: '1' });
      res = await axios.post(
        `${BASE}/api/v3/users/sign_in.json?app_id=${APP_ID}`,
        plainParams.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );
    } else {
      throw err;
    }
  }

  const data = res.data;
  if (!data || data.status_code === '20003') {
    throw new Error('Invalid Renpho email or password');
  }
  if (!data.terminal_user_session_key) {
    throw new Error(`Renpho auth failed: ${JSON.stringify(data)}`);
  }

  return {
    sessionKey: data.terminal_user_session_key,
    userId: data.id || null,
  };
}

async function getValidSession(email, password) {
  const creds = await getCredentials();

  // Reuse stored session if we have one
  if (creds?.session_key) {
    // Test if the session is still alive by attempting a lightweight call
    try {
      await axios.get(`${BASE}/api/v3/scale_users/list_scale_user`, {
        params: { locale: 'en', terminal_user_session_key: creds.session_key },
        timeout: 10000,
      });
      return { sessionKey: creds.session_key, userId: creds.renpho_user_id };
    } catch {
      // Session expired — fall through to re-auth
    }
  }

  // Re-authenticate
  const { sessionKey, userId } = await authenticate(email, password);
  await saveCredentials({ email, sessionKey, userId });
  return { sessionKey, userId };
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getScaleUsers(sessionKey) {
  const res = await axios.get(`${BASE}/api/v3/scale_users/list_scale_user`, {
    params: { locale: 'en', terminal_user_session_key: sessionKey },
    timeout: 10000,
  });
  return res.data.scale_users || [];
}

async function fetchMeasurements(userId, sessionKey, lastAt = '2020-01-01 00:00:00') {
  const res = await axios.get(`${BASE}/api/v2/measurements/list.json`, {
    params: {
      user_id: userId,
      last_at: lastAt,
      locale: 'en',
      app_id: APP_ID,
      terminal_user_session_key: sessionKey,
    },
    timeout: 15000,
  });
  return res.data.last_ary || [];
}

// ── Metric mapping ────────────────────────────────────────────────────────────

// Map raw Renpho measurement JSON fields to our body_metrics columns.
// Field names confirmed from hass-renpho and community docs.
function mapMeasurement(m) {
  const num = (v) => (v != null && v !== '' ? parseFloat(v) : null);
  const int = (v) => (v != null && v !== '' ? Math.round(parseFloat(v)) : null);

  // Renpho stores time_stamp as a unix timestamp (seconds) or ISO string
  let recordedAt;
  if (m.time_stamp) {
    const ts = Number(m.time_stamp);
    recordedAt = isNaN(ts) ? new Date(m.time_stamp) : new Date(ts * 1000);
  } else if (m.created_at) {
    recordedAt = new Date(m.created_at);
  } else {
    return null;
  }
  if (isNaN(recordedAt.getTime())) return null;

  return {
    recorded_at: recordedAt,
    weight_kg: num(m.weight),
    body_fat_pct: num(m.bodyfat),
    bmi: num(m.bmi),
    lean_mass_kg: num(m.sinew),       // sinew = muscle/lean mass in Renpho
    bone_mass_kg: num(m.bone),
    water_pct: num(m.water),
    visceral_fat: num(m.visfat),
    muscle_pct: num(m.muscle),
    muscle_mass_kg: num(m.sinew),
    bmr: int(m.bmr),
    metabolic_age: int(m.metabolic_age),
    protein_pct: num(m.protein),
    subcutaneous_fat_pct: num(m.subfat),
  };
}

// ── Sync ──────────────────────────────────────────────────────────────────────

async function syncMeasurements(email, password) {
  const { sessionKey, userId: authUserId } = await getValidSession(email, password);

  // Resolve the scale user ID (may differ from the auth user ID)
  let scaleUserId = authUserId;
  try {
    const scaleUsers = await getScaleUsers(sessionKey);
    if (scaleUsers.length > 0) {
      scaleUserId = scaleUsers[0].user_id || scaleUsers[0].id || authUserId;
    }
  } catch {
    // Non-fatal — use auth userId as fallback
  }

  if (!scaleUserId) {
    throw new Error('Could not determine Renpho user ID');
  }

  const raw = await fetchMeasurements(scaleUserId, sessionKey);

  let imported = 0;
  let skipped = 0;

  for (const m of raw) {
    const mapped = mapMeasurement(m);
    if (!mapped || mapped.weight_kg == null) { skipped++; continue; }

    try {
      await query(
        `INSERT INTO body_metrics
           (recorded_at, weight_kg, body_fat_pct, bmi, lean_mass_kg, bone_mass_kg,
            water_pct, visceral_fat, muscle_pct, muscle_mass_kg, bmr,
            metabolic_age, protein_pct, subcutaneous_fat_pct, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'renpho')
         ON DUPLICATE KEY UPDATE
           weight_kg            = COALESCE(VALUES(weight_kg),            weight_kg),
           body_fat_pct         = COALESCE(VALUES(body_fat_pct),         body_fat_pct),
           bmi                  = COALESCE(VALUES(bmi),                  bmi),
           lean_mass_kg         = COALESCE(VALUES(lean_mass_kg),         lean_mass_kg),
           bone_mass_kg         = COALESCE(VALUES(bone_mass_kg),         bone_mass_kg),
           water_pct            = COALESCE(VALUES(water_pct),            water_pct),
           visceral_fat         = COALESCE(VALUES(visceral_fat),         visceral_fat),
           muscle_pct           = COALESCE(VALUES(muscle_pct),           muscle_pct),
           muscle_mass_kg       = COALESCE(VALUES(muscle_mass_kg),       muscle_mass_kg),
           bmr                  = COALESCE(VALUES(bmr),                  bmr),
           metabolic_age        = COALESCE(VALUES(metabolic_age),        metabolic_age),
           protein_pct          = COALESCE(VALUES(protein_pct),          protein_pct),
           subcutaneous_fat_pct = COALESCE(VALUES(subcutaneous_fat_pct), subcutaneous_fat_pct)`,
        [
          mapped.recorded_at, mapped.weight_kg, mapped.body_fat_pct, mapped.bmi,
          mapped.lean_mass_kg, mapped.bone_mass_kg, mapped.water_pct, mapped.visceral_fat,
          mapped.muscle_pct, mapped.muscle_mass_kg, mapped.bmr, mapped.metabolic_age,
          mapped.protein_pct, mapped.subcutaneous_fat_pct,
        ]
      );
      imported++;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      skipped++;
    }
  }

  // Record last sync time
  await query(
    'UPDATE renpho_credentials SET last_sync = CURRENT_TIMESTAMP WHERE id = 1'
  );

  return { imported, skipped, total: raw.length };
}

async function getStatus() {
  const creds = await getCredentials();
  if (!creds?.email) return { connected: false };
  return {
    connected: true,
    email: creds.email,
    last_sync: creds.last_sync || null,
  };
}

async function disconnect() {
  await clearCredentials();
}

module.exports = {
  syncMeasurements,
  getStatus,
  disconnect,
  encryptPassword,
  decryptPassword,
  saveCredentials,
};
