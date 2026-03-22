const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'training_plan',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

async function initDB() {
  const pool = getPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INT PRIMARY KEY DEFAULT 1,
      name VARCHAR(100),
      dob DATE,
      weight_stones INT DEFAULT 16,
      weight_lbs INT DEFAULT 2,
      height_feet INT DEFAULT 5,
      height_inches INT DEFAULT 11,
      injury_notes TEXT DEFAULT 'Recovering from calf tear',
      running_experience TEXT DEFAULT 'Complete beginner — never run before',
      longest_distance_km DECIMAL(5,2) DEFAULT 0,
      previous_5k BOOLEAN DEFAULT FALSE,
      previous_10k BOOLEAN DEFAULT FALSE,
      goal_event_name VARCHAR(200) DEFAULT 'My First Ever 10k',
      target_race_date DATE,
      location VARCHAR(200),
      zwift_username VARCHAR(100),
      onboarding_complete BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS week_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phase INT NOT NULL,
      week_number INT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP NULL,
      notes TEXT,
      UNIQUE KEY unique_phase_week (phase, week_number)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS session_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_date DATE NOT NULL,
      activity_type VARCHAR(50) NOT NULL,
      distance_km DECIMAL(6,3),
      duration_seconds INT,
      avg_hr INT,
      calf_feel TINYINT,
      notes TEXT,
      strava_id BIGINT UNIQUE,
      strava_name VARCHAR(200),
      is_strava_synced BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      note_type VARCHAR(50),
      note_key VARCHAR(100),
      note_value TEXT,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_key (note_key)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS strava_tokens (
      id INT PRIMARY KEY DEFAULT 1,
      access_token TEXT,
      refresh_token TEXT,
      expires_at BIGINT,
      athlete_id BIGINT,
      athlete_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialised');
}

async function query(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { initDB, query, getPool };
