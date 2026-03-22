import React, { useState, useEffect } from 'react'
import { getSessions, logSession, deleteSession, getPersonalBests } from '../api'
import Card from '../components/Card'

const ACTIVITY_TYPES = [
  { value: 'run', label: '🏃 Run' },
  { value: 'zwift', label: '🚴 Zwift' },
  { value: 'cycling', label: '🚲 Cycling' },
  { value: 'walk', label: '🚶 Walk' },
  { value: 'activity', label: '⚡ Activity' },
]

const CALF_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😣']
const CALF_LABELS = ['', 'Great', 'Good', 'OK', 'Tender', 'Pain']

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  return `${m}:${s.toString().padStart(2,'0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function StravaBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: '#FC4C02', color: 'white' }}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
    </span>
  )
}

export default function SessionLog() {
  const [sessions, setSessions] = useState([])
  const [pbs, setPbs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: 'all', from: '', to: '' })
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    session_date: new Date().toISOString().substring(0,10),
    activity_type: 'run',
    distance_km: '',
    duration_minutes: '',
    duration_seconds_part: '',
    avg_hr: '',
    calf_feel: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const loadSessions = async () => {
    const params = { type: filter.type }
    if (filter.from) params.from = filter.from
    if (filter.to) params.to = filter.to
    try {
      const res = await getSessions(params)
      setSessions(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    Promise.all([loadSessions(), getPersonalBests().then(r => setPbs(r.data))])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSessions() }, [filter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dur = (parseInt(formData.duration_minutes || 0) * 60) + parseInt(formData.duration_seconds_part || 0)
      await logSession({
        session_date: formData.session_date,
        activity_type: formData.activity_type,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
        duration_seconds: dur || null,
        avg_hr: formData.avg_hr ? parseInt(formData.avg_hr) : null,
        calf_feel: formData.calf_feel ? parseInt(formData.calf_feel) : null,
        notes: formData.notes || null,
      })
      setFormData({
        session_date: new Date().toISOString().substring(0,10),
        activity_type: 'run',
        distance_km: '',
        duration_minutes: '',
        duration_seconds_part: '',
        avg_hr: '',
        calf_feel: '',
        notes: '',
      })
      setShowForm(false)
      loadSessions()
    } catch (err) {
      console.error(err)
      alert('Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Session Log</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Log Session'}
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <Card title="Log a Session">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input
                type="date"
                value={formData.session_date}
                onChange={e => setFormData(p => ({ ...p, session_date: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Activity Type</label>
              <select
                value={formData.activity_type}
                onChange={e => setFormData(p => ({ ...p, activity_type: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                {ACTIVITY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 2.5"
                value={formData.distance_km}
                onChange={e => setFormData(p => ({ ...p, distance_km: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Duration (min : sec)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={formData.duration_minutes}
                  onChange={e => setFormData(p => ({ ...p, duration_minutes: e.target.value }))}
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Sec"
                  value={formData.duration_seconds_part}
                  onChange={e => setFormData(p => ({ ...p, duration_seconds_part: e.target.value }))}
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Avg HR (bpm)</label>
              <input
                type="number"
                min="0"
                max="220"
                placeholder="e.g. 145"
                value={formData.avg_hr}
                onChange={e => setFormData(p => ({ ...p, avg_hr: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Calf Feel</label>
              <select
                value={formData.calf_feel}
                onChange={e => setFormData(p => ({ ...p, calf_feel: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Not rated</option>
                {CALF_EMOJIS.slice(1).map((em, i) => (
                  <option key={i+1} value={i+1}>{em} {CALF_LABELS[i+1]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea
                placeholder="How did it feel? Any issues?"
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Type</label>
            <select
              value={filter.type}
              onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}
              className="bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All types</option>
              {ACTIVITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">From</label>
            <input
              type="date"
              value={filter.from}
              onChange={e => setFilter(p => ({ ...p, from: e.target.value }))}
              className="bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">To</label>
            <input
              type="date"
              value={filter.to}
              onChange={e => setFilter(p => ({ ...p, to: e.target.value }))}
              className="bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          {(filter.from || filter.to || filter.type !== 'all') && (
            <button
              onClick={() => setFilter({ type: 'all', from: '', to: '' })}
              className="text-xs text-gray-400 hover:text-white py-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {/* Personal Bests */}
      {pbs && (pbs.first_run || pbs.longest_run || pbs.longest_duration) && (
        <Card title="Personal Bests" icon="🏆">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pbs.first_run && (
              <div className="bg-navy-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">First Ever Run</p>
                <p className="text-lg font-bold text-yellow-400">🎉</p>
                <p className="text-sm text-white">{formatDate(pbs.first_run.session_date)}</p>
                {pbs.first_run.distance_km && (
                  <p className="text-xs text-gray-400">{parseFloat(pbs.first_run.distance_km).toFixed(2)} km</p>
                )}
              </div>
            )}
            {pbs.longest_run && (
              <div className="bg-navy-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Longest Run</p>
                <p className="text-lg font-bold text-orange-400">
                  {parseFloat(pbs.longest_run.distance_km).toFixed(2)} km
                </p>
                <p className="text-xs text-gray-400">{formatDate(pbs.longest_run.session_date)}</p>
              </div>
            )}
            {pbs.longest_duration && (
              <div className="bg-navy-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Longest Run Time</p>
                <p className="text-lg font-bold text-blue-400">
                  {formatDuration(pbs.longest_duration.duration_seconds)}
                </p>
                <p className="text-xs text-gray-400">{formatDate(pbs.longest_duration.session_date)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Session table */}
      <Card title="Sessions" icon="📝">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-12 rounded-lg"></div>)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No sessions found. Log your first one above!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-navy-700">
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-right py-2 pr-3">Dist</th>
                  <th className="text-right py-2 pr-3">Time</th>
                  <th className="text-center py-2 pr-3">Calf</th>
                  <th className="text-left py-2 pr-3">Notes</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-navy-750">
                    <td className="py-2.5 pr-3 text-gray-300 whitespace-nowrap">{formatDate(s.session_date)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white capitalize">
                          {ACTIVITY_TYPES.find(t => t.value === s.activity_type)?.label || s.activity_type}
                        </span>
                        {s.is_strava_synced && <StravaBadge />}
                      </div>
                      {s.strava_name && (
                        <p className="text-xs text-gray-500 mt-0.5 max-w-[120px] truncate">{s.strava_name}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-white font-medium">
                      {s.distance_km ? `${parseFloat(s.distance_km).toFixed(2)}km` : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-300 whitespace-nowrap">
                      {formatDuration(s.duration_seconds)}
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      {s.calf_feel ? (
                        <span title={CALF_LABELS[s.calf_feel]} className="text-base">
                          {CALF_EMOJIS[s.calf_feel]}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-400 text-xs max-w-[150px] truncate">
                      {s.notes || '—'}
                    </td>
                    <td className="py-2.5">
                      {!s.is_strava_synced && (
                        deleteConfirm === s.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >✓</button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs text-gray-400 hover:text-gray-300"
                            >✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(s.id)}
                            className="text-xs text-gray-500 hover:text-red-400"
                          >🗑</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
