const unzipper = require('unzipper');
const { query } = require('./db');

// Health Connect export ZIP contains JSON files per data type.
// Filenames vary by Android version but follow these patterns:
//   WeightRecord / BodyWeight / Weight
//   BodyFatRecord / BodyFat
//   LeanBodyMassRecord / LeanBodyMass
//   BoneMassRecord / BoneMass
//   BasalMetabolicRateRecord / BasalMetabolicRate (not stored but used for BMI cross-check)

function matchesType(filename, ...keywords) {
  const lower = filename.toLowerCase().replace(/[^a-z]/g, '');
  return keywords.some(k => lower.includes(k.toLowerCase().replace(/[^a-z]/g, '')));
}

// Parse a single JSON file from the export and return typed records
function parseFile(filename, content) {
  let json;
  try {
    json = JSON.parse(content);
  } catch {
    return { type: null, records: [] };
  }

  // Records may live in json.data, json.records, or be the array itself
  const records = Array.isArray(json) ? json
    : Array.isArray(json.data) ? json.data
    : Array.isArray(json.records) ? json.records
    : [];

  if (matchesType(filename, 'weight', 'bodyweight')) {
    return { type: 'weight', records };
  }
  if (matchesType(filename, 'bodyfat', 'fatpercentage')) {
    return { type: 'bodyFat', records };
  }
  if (matchesType(filename, 'leanbodymass', 'leanmass')) {
    return { type: 'leanMass', records };
  }
  if (matchesType(filename, 'bonemass')) {
    return { type: 'boneMass', records };
  }
  return { type: null, records: [] };
}

// Extract a numeric value from a record field that may be a number or {value, unit} object
function extractValue(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && raw.value != null) return Number(raw.value);
  const parsed = Number(raw);
  return isNaN(parsed) ? null : parsed;
}

function extractTime(record) {
  const raw = record.time || record.startTime || record.date || record.timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// Parse the ZIP buffer and return a map: datetime string → metric row
async function parseExportZip(buffer) {
  const byTime = {}; // keyed by ISO datetime string

  const directory = await unzipper.Open.buffer(buffer);

  for (const file of directory.files) {
    if (file.type !== 'File' || !file.path.endsWith('.json')) continue;

    const basename = file.path.split('/').pop();
    // Skip manifest/export-info files
    if (matchesType(basename, 'exportinfo', 'manifest', 'metadata')) continue;

    const content = (await file.buffer()).toString('utf8');
    const { type, records } = parseFile(basename, content);
    if (!type || records.length === 0) continue;

    for (const record of records) {
      const time = extractTime(record);
      if (!time) continue;

      const key = time.toISOString();
      if (!byTime[key]) byTime[key] = { recorded_at: time };

      switch (type) {
        case 'weight': {
          // Weight may be stored as kg directly, or as {inKilograms}, or {value, unit}
          const kg = extractValue(record.weight ?? record.weightKg ?? record.inKilograms ?? record.value);
          if (kg != null && kg > 0 && kg < 500) byTime[key].weight_kg = kg;
          break;
        }
        case 'bodyFat': {
          const pct = extractValue(record.percentage ?? record.bodyFatPercentage ?? record.value ?? record.fat);
          if (pct != null && pct > 0 && pct < 100) byTime[key].body_fat_pct = pct;
          break;
        }
        case 'leanMass': {
          const kg = extractValue(record.mass ?? record.leanBodyMassKg ?? record.inKilograms ?? record.value);
          if (kg != null && kg > 0 && kg < 300) byTime[key].lean_mass_kg = kg;
          break;
        }
        case 'boneMass': {
          const kg = extractValue(record.mass ?? record.boneMassKg ?? record.inKilograms ?? record.value);
          if (kg != null && kg > 0 && kg < 10) byTime[key].bone_mass_kg = kg;
          break;
        }
      }
    }
  }

  return Object.values(byTime);
}

// Merge metrics that are within 60 seconds of each other (same Renpho weigh-in split across files)
function mergeNearbyMetrics(metrics) {
  if (metrics.length === 0) return [];

  const sorted = metrics.sort((a, b) => a.recorded_at - b.recorded_at);
  const merged = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const m = sorted[i];
    const diffMs = Math.abs(m.recorded_at - current.recorded_at);
    if (diffMs <= 60000) {
      // Merge into current — prefer the value that already exists
      if (m.weight_kg != null && current.weight_kg == null) current.weight_kg = m.weight_kg;
      if (m.body_fat_pct != null && current.body_fat_pct == null) current.body_fat_pct = m.body_fat_pct;
      if (m.lean_mass_kg != null && current.lean_mass_kg == null) current.lean_mass_kg = m.lean_mass_kg;
      if (m.bone_mass_kg != null && current.bone_mass_kg == null) current.bone_mass_kg = m.bone_mass_kg;
    } else {
      merged.push(current);
      current = { ...m };
    }
  }
  merged.push(current);
  return merged;
}

async function importMetrics(metrics) {
  const merged = mergeNearbyMetrics(metrics);
  let inserted = 0;
  let skipped = 0;

  for (const m of merged) {
    // Skip rows with no useful data
    if (m.weight_kg == null && m.body_fat_pct == null && m.lean_mass_kg == null && m.bone_mass_kg == null) {
      skipped++;
      continue;
    }

    try {
      await query(
        `INSERT INTO body_metrics (recorded_at, weight_kg, body_fat_pct, bmi, lean_mass_kg, bone_mass_kg, source)
         VALUES (?, ?, ?, NULL, ?, ?, 'health_connect')
         ON DUPLICATE KEY UPDATE
           weight_kg    = COALESCE(VALUES(weight_kg),    weight_kg),
           body_fat_pct = COALESCE(VALUES(body_fat_pct), body_fat_pct),
           lean_mass_kg = COALESCE(VALUES(lean_mass_kg), lean_mass_kg),
           bone_mass_kg = COALESCE(VALUES(bone_mass_kg), bone_mass_kg)`,
        [
          m.recorded_at,
          m.weight_kg ?? null,
          m.body_fat_pct ?? null,
          m.lean_mass_kg ?? null,
          m.bone_mass_kg ?? null,
        ]
      );
      inserted++;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      skipped++;
    }
  }

  return { imported: inserted, skipped };
}

async function getMetrics({ limit = 90, offset = 0 } = {}) {
  return query(
    `SELECT * FROM body_metrics ORDER BY recorded_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

async function getLatestMetrics() {
  const rows = await query(
    `SELECT * FROM body_metrics ORDER BY recorded_at DESC LIMIT 1`
  );
  return rows[0] || null;
}

module.exports = { parseExportZip, importMetrics, getMetrics, getLatestMetrics };
