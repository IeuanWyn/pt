import React, { useState } from 'react'
import { saveProfile } from '../api'
import { useApp } from '../context/AppContext'

function getFirstSaturdayOfNovember(year) {
  const nov1 = new Date(year, 10, 1)
  const dayOfWeek = nov1.getDay()
  const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek)
  return new Date(year, 10, 1 + daysUntilSat).toISOString().substring(0, 10)
}

export default function Onboarding() {
  const { loadProfile } = useApp()
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
  const [error, setError] = useState('')

  const calculateAge = (dob) => {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Please enter your name')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveProfile(form)
      await loadProfile()
    } catch (err) {
      setError('Failed to save profile. Is the server running?')
      setSaving(false)
    }
  }

  const age = calculateAge(form.dob)

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl">🏃</span>
          <h1 className="text-3xl font-bold text-white mt-3">Welcome to Your 10k Journey</h1>
          <p className="text-gray-400 mt-2">Let's set up your personalised training plan. Every step you take is a step you've never taken before.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-orange-400">Your Profile</h2>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Your Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white"
              placeholder="What should we call you?"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Date of Birth {age && <span className="text-orange-400">(Age: {age})</span>}
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={e => setForm(p => ({ ...p, dob: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white"
                placeholder="Town/city"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Weight</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" min="0" max="40" value={form.weight_stones}
                    onChange={e => setForm(p => ({ ...p, weight_stones: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white pr-6 text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-gray-400 text-xs">st</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" min="0" max="13" value={form.weight_lbs}
                    onChange={e => setForm(p => ({ ...p, weight_lbs: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white pr-6 text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-gray-400 text-xs">lb</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Height</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" min="0" max="8" value={form.height_feet}
                    onChange={e => setForm(p => ({ ...p, height_feet: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white pr-6 text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-gray-400 text-xs">ft</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" min="0" max="11" value={form.height_inches}
                    onChange={e => setForm(p => ({ ...p, height_inches: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white pr-6 text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-gray-400 text-xs">in</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Injury / Health Notes</label>
            <textarea
              value={form.injury_notes}
              onChange={e => setForm(p => ({ ...p, injury_notes: e.target.value }))}
              rows={2}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Running Experience</label>
            <textarea
              value={form.running_experience}
              onChange={e => setForm(p => ({ ...p, running_experience: e.target.value }))}
              rows={2}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Goal Event</label>
              <input
                type="text"
                value={form.goal_event_name}
                onChange={e => setForm(p => ({ ...p, goal_event_name: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Race Date</label>
              <input
                type="date"
                value={form.target_race_date}
                onChange={e => setForm(p => ({ ...p, target_race_date: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Zwift Username (optional)</label>
            <input
              type="text"
              value={form.zwift_username}
              onChange={e => setForm(p => ({ ...p, zwift_username: e.target.value }))}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-white text-sm"
              placeholder="Optional"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-3 py-2">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800 text-white rounded-xl font-bold text-lg transition-colors"
            >
              {saving ? 'Setting up your plan...' : "Let's Start Training! 🏃"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
