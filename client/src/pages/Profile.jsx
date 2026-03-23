import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { saveProfile, getStravaAuthUrl, disconnectStrava, clearAllData, importHealthConnect, getBodyMetrics, getLatestBodyMetrics, getRenphoStatus, connectRenpho, syncRenpho, disconnectRenpho } from '../api'
import Card from '../components/Card'

function getFirstSaturdayOfNovember(year) {
  const nov1 = new Date(year, 10, 1) // November 1st
  const dayOfWeek = nov1.getDay() // 0=Sun, 6=Sat
  const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek)
  const satDate = new Date(year, 10, 1 + daysUntilSat)
  return satDate.toISOString().substring(0, 10)
}

export default function Profile() {
  const { profile, setProfile, loadProfile, stravaConnected, stravaInfo, loadStravaStatus, setStravaConnected, setStravaInfo, calculateAge } = useApp()

  const defaultRaceDate = getFirstSaturdayOfNovember(2026)

  const [form, setForm] = useState({
    name: '',
    dob: '1991-10-07',
    weight_stones: 16,
    weight_lbs: 2,
    height_feet: 5,
    height_inches: 11,
    injury_notes: 'Recovering from calf tear',
    running_experience: 'Complete beginner — never run before',
    longest_distance_km: 0,
    previous_5k: false,
    previous_10k: false,
    goal_event_name: 'My First Ever 10k',
    target_race_date: defaultRaceDate,
    location: '',
    zwift_username: '',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Renpho
  const [renphoStatus, setRenphoStatus] = useState(null)
  const [renphoForm, setRenphoForm] = useState({ email: '', password: '' })
  const [renphoConnecting, setRenphoConnecting] = useState(false)
  const [renphoSyncing, setRenphoSyncing] = useState(false)
  const [renphoMsg, setRenphoMsg] = useState(null)

  useEffect(() => {
    getRenphoStatus().then(r => setRenphoStatus(r.data)).catch(() => {})
  }, [])

  const handleRenphoConnect = async (e) => {
    e.preventDefault()
    setRenphoConnecting(true)
    setRenphoMsg(null)
    try {
      const res = await connectRenpho(renphoForm)
      setRenphoMsg({ success: true, text: res.data.message })
      setRenphoStatus({ connected: true, email: renphoForm.email, last_sync: new Date().toISOString() })
      setRenphoForm({ email: '', password: '' })
      // Refresh body metrics
      const [latest, history] = await Promise.all([getLatestBodyMetrics(), getBodyMetrics({ limit: 10 })])
      setHcLatest(latest.data || null)
      setHcHistory(history.data || [])
    } catch (err) {
      setRenphoMsg({ success: false, text: err.response?.data?.error || 'Connection failed' })
    } finally {
      setRenphoConnecting(false)
    }
  }

  const handleRenphoSync = async () => {
    setRenphoSyncing(true)
    setRenphoMsg(null)
    try {
      const res = await syncRenpho()
      setRenphoMsg({ success: true, text: res.data.message })
      setRenphoStatus(s => ({ ...s, last_sync: new Date().toISOString() }))
      const [latest, history] = await Promise.all([getLatestBodyMetrics(), getBodyMetrics({ limit: 10 })])
      setHcLatest(latest.data || null)
      setHcHistory(history.data || [])
    } catch (err) {
      setRenphoMsg({ success: false, text: err.response?.data?.error || 'Sync failed' })
    } finally {
      setRenphoSyncing(false)
    }
  }

  const handleRenphoDisconnect = async () => {
    await disconnectRenpho()
    setRenphoStatus({ connected: false })
    setRenphoMsg(null)
  }

  // Health Connect
  const [hcImporting, setHcImporting] = useState(false)
  const [hcResult, setHcResult] = useState(null)
  const [hcLatest, setHcLatest] = useState(null)
  const [hcHistory, setHcHistory] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    getLatestBodyMetrics().then(r => setHcLatest(r.data || null)).catch(() => {})
    getBodyMetrics({ limit: 10 }).then(r => setHcHistory(r.data || [])).catch(() => {})
  }, [])

  const handleHcImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHcImporting(true)
    setHcResult(null)
    try {
      const res = await importHealthConnect(file)
      setHcResult({ success: true, message: res.data.message })
      // Refresh data
      const [latest, history] = await Promise.all([
        getLatestBodyMetrics(),
        getBodyMetrics({ limit: 10 }),
      ])
      setHcLatest(latest.data || null)
      setHcHistory(history.data || [])
    } catch (err) {
      setHcResult({ success: false, message: err.response?.data?.error || 'Import failed' })
    } finally {
      setHcImporting(false)
      e.target.value = ''
    }
  }

  function kgToStoneLbs(kg) {
    const totalLbs = kg * 2.20462
    const stone = Math.floor(totalLbs / 14)
    const lbs = Math.round(totalLbs % 14)
    return `${stone}st ${lbs}lb`
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        dob: profile.dob ? profile.dob.substring(0, 10) : '1991-10-07',
        weight_stones: profile.weight_stones || 16,
        weight_lbs: profile.weight_lbs || 2,
        height_feet: profile.height_feet || 5,
        height_inches: profile.height_inches || 11,
        injury_notes: profile.injury_notes || 'Recovering from calf tear',
        running_experience: profile.running_experience || 'Complete beginner — never run before',
        longest_distance_km: profile.longest_distance_km || 0,
        previous_5k: !!profile.previous_5k,
        previous_10k: !!profile.previous_10k,
        goal_event_name: profile.goal_event_name || 'My First Ever 10k',
        target_race_date: profile.target_race_date ? profile.target_race_date.substring(0, 10) : defaultRaceDate,
        location: profile.location || '',
        zwift_username: profile.zwift_username || '',
      })
    }
  }, [profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveProfile(form)
      await loadProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleStravaConnect = async () => {
    try {
      const res = await getStravaAuthUrl()
      window.location.href = res.data.url
    } catch (err) {
      console.error(err)
    }
  }

  const handleStravaDisconnect = async () => {
    try {
      await disconnectStrava()
      setStravaConnected(false)
      setStravaInfo(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await clearAllData()
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('Failed to clear data')
    } finally {
      setClearing(false)
    }
  }

  const age = calculateAge(form.dob)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-white">Profile & Settings</h2>

      {/* Strava connection */}
      <Card title="Strava Integration" icon="🚴">
        {stravaConnected ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-medium">Connected ✓</p>
              {stravaInfo?.athlete_name && (
                <p className="text-sm text-gray-400 mt-0.5">Athlete: {stravaInfo.athlete_name}</p>
              )}
            </div>
            <button
              onClick={handleStravaDisconnect}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-300 text-sm">Connect Strava to automatically sync your activities</p>
            <button
              onClick={handleStravaConnect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: '#FC4C02' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Connect Strava
            </button>
          </div>
        )}
      </Card>

      {/* Renpho direct API */}
      <Card title="Renpho Scale (Direct Sync)" icon="⚖️">
        {renphoStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-medium">Connected ✓</p>
                <p className="text-xs text-gray-400 mt-0.5">{renphoStatus.email}</p>
                {renphoStatus.last_sync && (
                  <p className="text-xs text-gray-500 mt-0.5">Last sync: {formatDate(renphoStatus.last_sync)}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRenphoSync}
                  disabled={renphoSyncing}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 text-white rounded-lg text-sm"
                >
                  {renphoSyncing ? 'Syncing...' : 'Sync now'}
                </button>
                <button
                  onClick={handleRenphoDisconnect}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>
            {renphoMsg && (
              <p className={`text-sm ${renphoMsg.success ? 'text-green-400' : 'text-red-400'}`}>{renphoMsg.text}</p>
            )}
            <p className="text-xs text-amber-400/80">
              Note: syncing will log you out of the Renpho app. Re-opening the app will expire this session until you sync again.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Connect directly to Renpho's cloud to pull all 13+ body composition metrics automatically
              (body fat, visceral fat, muscle mass, BMR, metabolic age, protein %, and more).
            </p>
            <p className="text-xs text-amber-400/80">
              ⚠️ Uses your Renpho account credentials. Syncing will temporarily log you out of the Renpho app.
            </p>
            <form onSubmit={handleRenphoConnect} className="space-y-2">
              <input
                type="email"
                placeholder="Renpho account email"
                value={renphoForm.email}
                onChange={e => setRenphoForm(p => ({ ...p, email: e.target.value }))}
                required
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="password"
                placeholder="Renpho account password"
                value={renphoForm.password}
                onChange={e => setRenphoForm(p => ({ ...p, password: e.target.value }))}
                required
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                type="submit"
                disabled={renphoConnecting}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 text-white rounded-lg text-sm font-medium"
              >
                {renphoConnecting ? 'Connecting...' : 'Connect & Sync Renpho'}
              </button>
            </form>
            {renphoMsg && (
              <p className={`text-sm ${renphoMsg.success ? 'text-green-400' : 'text-red-400'}`}>{renphoMsg.text}</p>
            )}
          </div>
        )}
      </Card>

      {/* Health Connect */}
      <Card title="Health Connect (Other Data)" icon="❤️">
        <div className="space-y-4">
          {/* Latest metrics summary */}
          {hcLatest && hcLatest.recorded_at ? (
            <div>
              <p className="text-xs text-gray-400 mb-2">Latest measurement — {formatDate(hcLatest.recorded_at)}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {hcLatest.weight_kg != null && (
                  <div className="bg-navy-900 rounded-lg px-3 py-2 text-center">
                    <p className="text-white font-semibold text-sm">{kgToStoneLbs(hcLatest.weight_kg)}</p>
                    <p className="text-gray-400 text-xs">Weight</p>
                  </div>
                )}
                {hcLatest.body_fat_pct != null && (
                  <div className="bg-navy-900 rounded-lg px-3 py-2 text-center">
                    <p className="text-white font-semibold text-sm">{Number(hcLatest.body_fat_pct).toFixed(1)}%</p>
                    <p className="text-gray-400 text-xs">Body Fat</p>
                  </div>
                )}
                {hcLatest.lean_mass_kg != null && (
                  <div className="bg-navy-900 rounded-lg px-3 py-2 text-center">
                    <p className="text-white font-semibold text-sm">{Number(hcLatest.lean_mass_kg).toFixed(1)} kg</p>
                    <p className="text-gray-400 text-xs">Lean Mass</p>
                  </div>
                )}
                {hcLatest.bone_mass_kg != null && (
                  <div className="bg-navy-900 rounded-lg px-3 py-2 text-center">
                    <p className="text-white font-semibold text-sm">{Number(hcLatest.bone_mass_kg).toFixed(2)} kg</p>
                    <p className="text-gray-400 text-xs">Bone Mass</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No body metrics yet. Import your Health Connect export below.</p>
          )}

          {/* Recent history */}
          {hcHistory.length > 1 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-gray-300">
                <thead>
                  <tr className="text-gray-500 border-b border-navy-700">
                    <th className="text-left py-1 pr-3">Date</th>
                    <th className="text-right pr-3">Weight</th>
                    <th className="text-right pr-3">Body Fat</th>
                    <th className="text-right">Lean Mass</th>
                  </tr>
                </thead>
                <tbody>
                  {hcHistory.map(m => (
                    <tr key={m.id} className="border-b border-navy-800/50">
                      <td className="py-1 pr-3 text-gray-400">{formatDate(m.recorded_at)}</td>
                      <td className="text-right pr-3">{m.weight_kg != null ? kgToStoneLbs(m.weight_kg) : '—'}</td>
                      <td className="text-right pr-3">{m.body_fat_pct != null ? `${Number(m.body_fat_pct).toFixed(1)}%` : '—'}</td>
                      <td className="text-right">{m.lean_mass_kg != null ? `${Number(m.lean_mass_kg).toFixed(1)} kg` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Import button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleHcImport}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={hcImporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {hcImporting ? 'Importing...' : 'Import Health Connect Export (.zip)'}
            </button>
            {hcResult && (
              <p className={`text-sm mt-2 ${hcResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {hcResult.message}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card title="Personal Details">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Date of Birth {form.dob && <span className="text-emerald-400">(Age: {age})</span>}
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={e => setForm(p => ({ ...p, dob: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Location (town/city)</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="e.g. Manchester"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Weight (stones & lbs)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number" min="0" max="40"
                    value={form.weight_stones}
                    onChange={e => setForm(p => ({ ...p, weight_stones: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm pr-8"
                  />
                  <span className="absolute right-2 top-2 text-gray-400 text-xs">st</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number" min="0" max="13"
                    value={form.weight_lbs}
                    onChange={e => setForm(p => ({ ...p, weight_lbs: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm pr-8"
                  />
                  <span className="absolute right-2 top-2 text-gray-400 text-xs">lb</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Height (feet & inches)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number" min="0" max="8"
                    value={form.height_feet}
                    onChange={e => setForm(p => ({ ...p, height_feet: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm pr-8"
                  />
                  <span className="absolute right-2 top-2 text-gray-400 text-xs">ft</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number" min="0" max="11"
                    value={form.height_inches}
                    onChange={e => setForm(p => ({ ...p, height_inches: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm pr-8"
                  />
                  <span className="absolute right-2 top-2 text-gray-400 text-xs">in</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Injury / Health Notes</label>
              <textarea
                value={form.injury_notes}
                onChange={e => setForm(p => ({ ...p, injury_notes: e.target.value }))}
                rows={2}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Running Experience</label>
              <textarea
                value={form.running_experience}
                onChange={e => setForm(p => ({ ...p, running_experience: e.target.value }))}
                rows={2}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Longest distance ever run (km)</label>
              <input
                type="number" step="0.1" min="0"
                value={form.longest_distance_km}
                onChange={e => setForm(p => ({ ...p, longest_distance_km: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Previous events</label>
              <div className="space-y-2 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.previous_5k}
                    onChange={e => setForm(p => ({ ...p, previous_5k: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-sm text-gray-300">Completed a 5k before</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.previous_10k}
                    onChange={e => setForm(p => ({ ...p, previous_10k: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-sm text-gray-300">Completed a 10k before</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Goal Event Name</label>
              <input
                type="text"
                value={form.goal_event_name}
                onChange={e => setForm(p => ({ ...p, goal_event_name: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Race Date</label>
              <input
                type="date"
                value={form.target_race_date}
                onChange={e => setForm(p => ({ ...p, target_race_date: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Zwift Username (optional)</label>
              <input
                type="text"
                value={form.zwift_username}
                onChange={e => setForm(p => ({ ...p, zwift_username: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
          </button>
        </form>
      </Card>

      {/* Danger zone */}
      <Card title="Danger Zone" className="border-red-800/50">
        <p className="text-sm text-gray-400 mb-3">
          Permanently delete all your training data, sessions, chat history, and profile. This cannot be undone.
        </p>
        {showClearConfirm ? (
          <div className="space-y-2">
            <p className="text-red-400 font-medium text-sm">Are you absolutely sure? All data will be lost forever.</p>
            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm"
              >
                {clearing ? 'Clearing...' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 rounded-lg text-sm"
          >
            Clear all data
          </button>
        )}
      </Card>
    </div>
  )
}
