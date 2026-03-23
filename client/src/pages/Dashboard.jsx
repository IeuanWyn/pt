import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getSessions, getStats } from '../api'
import Card from '../components/Card'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  return `${m} min`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function ActivityBadge({ isStrava }) {
  if (!isStrava) return null
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: '#FC4C02', color: 'white' }}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Strava
    </span>
  )
}

const activityLabels = {
  run: 'Run',
  zwift: 'Zwift',
  cycling: 'Ride',
  walk: 'Walk',
  activity: 'Activity',
}

export default function Dashboard() {
  const { profile, currentPhase, phaseNames, weeksToRace, calculateAge, setActiveTab, handleSync, syncing, stravaConnected } = useApp()
  const [recentSessions, setRecentSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSessions({ limit: 5 }),
      getStats(),
    ]).then(([sessRes, statsRes]) => {
      setRecentSessions(sessRes.data)
      setStats(statsRes.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const phase = currentPhase()
  const weeks = weeksToRace()
  const age = profile ? calculateAge(profile.dob) : 34
  const totalSessions = stats?.total_sessions || 0

  const raceDate = profile?.target_race_date
    ? new Date(profile.target_race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'November 2026'

  // % complete — rough estimate based on phase
  const phaseProgress = [25, 50, 75, 100]
  const pctComplete = Math.round((phaseProgress[phase - 1] - 25) + (totalSessions > 0 ? Math.min(25, totalSessions) : 0))

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Phase', value: `${phase}: ${phaseNames[phase - 1]}`, color: 'text-emerald-400' },
          { label: 'Weeks to Race', value: weeks !== null ? weeks : '—', color: 'text-blue-400' },
          { label: 'Sessions Logged', value: totalSessions, color: 'text-green-400' },
          { label: 'Plan Progress', value: `${pctComplete}%`, color: 'text-purple-400' },
        ].map(stat => (
          <Card key={stat.label} className="text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* My Story card */}
      <Card title="My Story" icon="🎽">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-400">Age: </span>
              <span className="text-white font-medium">{age}</span>
            </div>
            <div>
              <span className="text-gray-400">Level: </span>
              <span className="text-white font-medium">Complete Beginner 🎽</span>
            </div>
            <div>
              <span className="text-gray-400">Goal: </span>
              <span className="text-white font-medium">{profile?.goal_event_name || 'First Ever 10k'}</span>
            </div>
            <div>
              <span className="text-gray-400">Race Date: </span>
              <span className="text-emerald-400 font-medium">{raceDate}</span>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-700 pt-3">
            <p className="text-emerald-300 italic text-sm font-medium">
              "Every step you take is a step you've never taken before."
            </p>
          </div>
          {profile?.injury_notes && (
            <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-xs text-red-300">⚠️ {profile.injury_notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {stravaConnected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-all"
            style={{ backgroundColor: syncing ? '#9b4a23' : '#FC4C02' }}
          >
            {syncing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            )}
            {syncing ? 'Syncing...' : 'Sync Strava'}
          </button>
        )}
        <button
          onClick={() => setActiveTab('coach')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors ${stravaConnected ? '' : 'col-span-2'}`}
        >
          <span>💬</span> Chat with Coach
        </button>
      </div>

      {/* Recent activities */}
      <Card title="Recent Activity" icon="🏃">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton h-10 rounded-lg"></div>
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">No sessions logged yet.</p>
            <button
              onClick={() => setActiveTab('sessions')}
              className="mt-2 text-emerald-400 text-sm hover:underline"
            >
              Log your first session →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {recentSessions.map(session => (
              <div key={session.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white capitalize">
                      {activityLabels[session.activity_type] || session.activity_type}
                    </span>
                    <ActivityBadge isStrava={session.is_strava_synced} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(session.session_date)}
                    {session.strava_name && ` • ${session.strava_name}`}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {session.distance_km && (
                    <p className="text-white font-medium">{parseFloat(session.distance_km).toFixed(2)} km</p>
                  )}
                  <p className="text-gray-400 text-xs">{formatDuration(session.duration_seconds)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* This week */}
      <Card title="This Week" icon="📅">
        <p className="text-sm text-gray-300 mb-2">
          Phase {phase} — {phaseNames[phase - 1]}
        </p>
        {phase === 1 && (
          <ul className="text-sm text-gray-300 space-y-1">
            <li>🚴 Zwift 3–4× this week (Zone 2, 30–45 min)</li>
            <li>🚶 Daily walking targets</li>
            <li>💪 Calf rehab exercises (see Plan tab)</li>
          </ul>
        )}
        {phase === 2 && (
          <ul className="text-sm text-gray-300 space-y-1">
            <li>🏃 3× Run/Walk sessions</li>
            <li>🚴 Zwift 2× (Zone 2)</li>
            <li>💪 Continue calf rehab</li>
          </ul>
        )}
        {phase === 3 && (
          <ul className="text-sm text-gray-300 space-y-1">
            <li>🏃 Easy run (conversational pace)</li>
            <li>🏃 Long run (+10% from last week)</li>
            <li>⚡ Tempo effort (comfortably hard)</li>
          </ul>
        )}
        {phase === 4 && (
          <ul className="text-sm text-gray-300 space-y-1">
            <li>🏃 Easy run</li>
            <li>⚡ Tempo run</li>
            <li>📏 Long run (10k goal distance)</li>
          </ul>
        )}
        <button
          onClick={() => setActiveTab('plan')}
          className="mt-3 text-emerald-400 text-sm hover:underline"
        >
          View full plan →
        </button>
      </Card>
    </div>
  )
}
