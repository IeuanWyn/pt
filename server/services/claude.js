const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('./db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function calculateAge(dob) {
  if (!dob) return 34;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function isBirthday(dob) {
  if (!dob) return false;
  const birthDate = new Date(dob);
  const today = new Date();
  return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
}

function weeksToRace(raceDate) {
  if (!raceDate) return null;
  const race = new Date(raceDate);
  const today = new Date();
  const diff = race - today;
  return Math.max(0, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

function formatDuration(seconds) {
  if (!seconds) return 'unknown duration';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

async function buildSystemPrompt() {
  const profiles = await query('SELECT * FROM user_profile WHERE id = 1');
  const profile = profiles[0] || {};

  const recentSessions = await query(`
    SELECT * FROM session_log
    ORDER BY session_date DESC
    LIMIT 10
  `);

  const totalSessions = await query('SELECT COUNT(*) as count FROM session_log');
  const totalCount = totalSessions[0]?.count || 0;

  const age = calculateAge(profile.dob);
  const weeks = weeksToRace(profile.target_race_date);
  const birthday = isBirthday(profile.dob);

  const recentActivitiesText = recentSessions.length
    ? recentSessions.map(s => {
        const dist = s.distance_km ? `${parseFloat(s.distance_km).toFixed(2)}km` : 'no distance';
        const dur = formatDuration(s.duration_seconds);
        const hr = s.avg_hr ? `, avg HR: ${s.avg_hr}bpm` : '';
        const strava = s.is_strava_synced ? ' [Strava]' : '';
        return `- ${s.session_date}: ${s.activity_type} — ${dist}, ${dur}${hr}${strava}`;
      }).join('\n')
    : 'No recent activities logged yet.';

  const weightStr = profile.weight_stones
    ? `${profile.weight_stones}st ${profile.weight_lbs || 0}lb`
    : '16st 2lb';

  const heightStr = profile.height_feet
    ? `${profile.height_feet}ft ${profile.height_inches || 0}"`
    : `5ft 11"`;

  let birthdayNote = '';
  if (birthday) {
    birthdayNote = `\n\nIMPORTANT: Today is ${profile.name || 'the user'}'s birthday! Start your response with a warm, personal birthday greeting before addressing their question.`;
  }

  return `You are a personal running coach for a complete beginner. The user has never run a 5k or 10k before — this will be their first ever running event of any kind.

User profile:
- Name: ${profile.name || 'Unknown'}
- Age: ${age} (DOB: ${profile.dob || '07/10/1991'})
- Weight: ${weightStr}, Height: ${heightStr}
- Injury: ${profile.injury_notes || 'Recovering from a calf tear'}
- Running experience: ${profile.running_experience || 'Complete beginner — never run before'}
- Longest distance ever run: ${profile.longest_distance_km || 0}km
- Previous 5k completed: ${profile.previous_5k ? 'Yes' : 'No'}
- Previous 10k completed: ${profile.previous_10k ? 'Yes' : 'No'}
- Fitness background: Zwift cyclist, no running history whatsoever
- Goal: ${profile.goal_event_name || 'My First Ever 10k'} — target race date: ${profile.target_race_date || 'November 2026'}
- Location: ${profile.location || 'Not specified'}
- Zwift username: ${profile.zwift_username || 'Not set'}
${weeks !== null ? `- Weeks to race: approximately ${weeks} weeks` : ''}

Recent activities (last 10):
${recentActivitiesText}

Overall progress:
- Total sessions logged: ${totalCount}

Coaching guidelines:
- Never assume any prior running knowledge — explain concepts like pace, cadence, Zone 2, RPE etc. if they come up
- Be encouraging but realistic — a first ever 10k in November is completely achievable with consistency and patience
- Celebrate small wins heavily — first continuous 1k, first 5 minute run, finishing a run/walk session are all massive milestones for this user
- Be especially cautious around the calf injury — a beginner who overtrains on a healing calf is a high injury risk
- Factor in that carrying extra weight as a beginner increases joint load — low impact alternatives and walk breaks are always valid and should be encouraged
- If the user reports any calf pain at all, always recommend rest and suggest consulting a physio before continuing — never push through calf pain
- Reference their actual Strava data where available (e.g. "I can see your last run was...")
- Speak in a friendly, direct, non-patronising tone — warm but honest
- Use markdown formatting in responses (bold for emphasis, bullet points for lists, etc.)${birthdayNote}`;
}

async function chat(userMessage) {
  const systemPrompt = await buildSystemPrompt();

  const history = await query(`
    SELECT role, content FROM chat_history
    ORDER BY created_at ASC
    LIMIT 50
  `);

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const assistantMessage = response.content[0].text;

  await query('INSERT INTO chat_history (role, content) VALUES (?, ?)', ['user', userMessage]);
  await query('INSERT INTO chat_history (role, content) VALUES (?, ?)', ['assistant', assistantMessage]);

  return assistantMessage;
}

async function clearHistory() {
  await query('DELETE FROM chat_history');
}

module.exports = { chat, clearHistory, buildSystemPrompt };
