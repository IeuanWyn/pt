import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getProgress, saveProgress, getNotes, saveNote } from '../api'
import Card from '../components/Card'

const PHASE_LABELS = ['Foundation', 'Run/Walk Introduction', 'Base Building', '10k Prep']
const PHASE_DATES = ['Now → End of April', 'May → June', 'July → September', 'October → November']

const PHASE2_WEEKS = [
  { week: 1, desc: 'Run 1 min / Walk 2 min × 6', sessions: 3 },
  { week: 2, desc: 'Run 1 min / Walk 2 min × 6', sessions: 3 },
  { week: 3, desc: 'Run 2 min / Walk 2 min × 6', sessions: 3 },
  { week: 4, desc: 'Run 2 min / Walk 2 min × 6', sessions: 3 },
  { week: 5, desc: 'Run 3 min / Walk 1 min × 6', sessions: 3 },
  { week: 6, desc: 'Run 3 min / Walk 1 min × 6', sessions: 3 },
  { week: 7, desc: 'Run 5 min / Walk 1 min × 5', sessions: 3 },
  { week: 8, desc: 'Run 5 min / Walk 1 min × 5', sessions: 3 },
]

const PHASE1_CHECKLIST = [
  'No calf pain during or after daily walking',
  'Completing 20+ single leg calf raises (both legs)',
  'Walking 30+ minutes continuously pain-free',
  'Zwift Zone 2 sessions feeling comfortable',
  'No swelling or stiffness in calf after exercise',
]

const CALF_REHAB = [
  { name: 'Straight-leg calf raises', sets: '3', reps: '15', note: 'Both legs, slow and controlled' },
  { name: 'Bent-knee calf raises', sets: '3', reps: '15', note: 'Knees slightly bent, targets soleus' },
  { name: 'Single-leg calf raises (straight)', sets: '3', reps: '10–15', note: 'Progress when 2-leg is pain-free' },
  { name: 'Single-leg calf raises (bent)', sets: '3', reps: '10–15', note: 'Final progression before running' },
]

export default function Plan() {
  const { currentPhase } = useApp()
  const [activePhase, setActivePhase] = useState(currentPhase())
  const [progress, setProgress] = useState({})
  const [checklist, setChecklist] = useState({})
  const [milestones, setMilestones] = useState({})

  useEffect(() => {
    getProgress().then(res => {
      const map = {}
      res.data.forEach(row => { map[`${row.phase}_${row.week_number}`] = row })
      setProgress(map)
    }).catch(console.error)

    getNotes('checklist').then(res => {
      const map = {}
      res.data.forEach(row => { map[row.note_key] = row })
      setChecklist(map)
    }).catch(console.error)

    getNotes('milestone').then(res => {
      const map = {}
      res.data.forEach(row => { map[row.note_key] = row })
      setMilestones(map)
    }).catch(console.error)
  }, [])

  const toggleWeek = async (phase, week) => {
    const key = `${phase}_${week}`
    const current = progress[key]?.completed || false
    await saveProgress({ phase, week_number: week, completed: !current })
    setProgress(prev => ({
      ...prev,
      [key]: { ...prev[key], completed: !current },
    }))
  }

  const toggleChecklist = async (key, value) => {
    const current = checklist[key]?.completed || false
    await saveNote({ note_type: 'checklist', note_key: key, note_value: value, completed: !current })
    setChecklist(prev => ({
      ...prev,
      [key]: { ...prev[key], completed: !current, note_value: value },
    }))
  }

  const toggleMilestone = async (key, value) => {
    const current = milestones[key]?.completed || false
    await saveNote({ note_type: 'milestone', note_key: key, note_value: value, completed: !current })
    setMilestones(prev => ({
      ...prev,
      [key]: { ...prev[key], completed: !current },
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-white">Training Plan</h2>

      {/* Phase sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {PHASE_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setActivePhase(i + 1)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePhase === i + 1
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            Phase {i + 1}: {label}
          </button>
        ))}
      </div>

      {/* Phase 1 */}
      {activePhase === 1 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-emerald-400 text-lg">Phase 1: Foundation</h3>
              <span className="text-xs text-gray-400">{PHASE_DATES[0]}</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Before you run a single step, we build your foundation. The calf needs time to heal fully.
              Meanwhile, Zwift fitness, walking, and calf rehab prepare your body.
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">🚴 Zwift Sessions</h4>
                <ul className="text-sm text-gray-300 space-y-1 ml-4">
                  <li>• 3–4× per week, 30–45 minutes</li>
                  <li>• Zone 2 effort — you should be able to hold a conversation</li>
                  <li>• Heart rate: ~120–140 bpm (roughly 60–70% max HR)</li>
                  <li>• Focus on consistency, not intensity</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">🚶 Daily Walking</h4>
                <ul className="text-sm text-gray-300 space-y-1 ml-4">
                  <li>• Aim for 20–30 minutes daily</li>
                  <li>• Brisk walking pace (not a stroll)</li>
                  <li>• Builds aerobic base and conditions legs gently</li>
                  <li>• Stop if any calf discomfort</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">💪 Calf Rehab Exercises</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-slate-700">
                        <th className="text-left py-2 pr-4">Exercise</th>
                        <th className="text-center py-2 pr-4">Sets</th>
                        <th className="text-center py-2 pr-4">Reps</th>
                        <th className="text-left py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {CALF_REHAB.map(ex => (
                        <tr key={ex.name}>
                          <td className="py-2 pr-4 text-white font-medium">{ex.name}</td>
                          <td className="py-2 pr-4 text-center text-emerald-400">{ex.sets}</td>
                          <td className="py-2 pr-4 text-center text-emerald-400">{ex.reps}</td>
                          <td className="py-2 text-gray-400 text-xs">{ex.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">✅ Ready to Progress Checklist</h4>
                <p className="text-xs text-gray-400 mb-3">Tick off each item before moving to Phase 2</p>
                <div className="space-y-2">
                  {PHASE1_CHECKLIST.map((item, i) => {
                    const key = `p1_check_${i}`
                    const done = checklist[key]?.completed || false
                    return (
                      <label key={i} className="flex items-start gap-3 cursor-pointer group">
                        <div
                          onClick={() => toggleChecklist(key, item)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            done ? 'bg-green-500 border-green-500' : 'border-gray-500 group-hover:border-emerald-400'
                          }`}
                        >
                          {done && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className={`text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-3 text-sm text-gray-400">
                  {Object.values(checklist).filter(c => c.completed && c.note_key?.startsWith('p1_check_')).length}
                  /{PHASE1_CHECKLIST.length} complete
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Phase 2 */}
      {activePhase === 2 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-emerald-400 text-lg">Phase 2: Run/Walk Introduction</h3>
              <span className="text-xs text-gray-400">{PHASE_DATES[1]}</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Your first running steps! Run/walk intervals are the safest, most effective way to start running
              from scratch — used by elite coaches worldwide for beginners.
            </p>
            <div className="bg-slate-900 rounded-lg p-3 mb-4 text-sm text-gray-300">
              <strong className="text-emerald-300">Important:</strong> The run effort should feel easy — you're not racing.
              If you can't speak in short sentences while running, slow down.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Week</th>
                    <th className="text-left py-2 pr-4">Session Structure</th>
                    <th className="text-center py-2 pr-4">Sessions/wk</th>
                    <th className="text-center py-2">Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {PHASE2_WEEKS.map(w => {
                    const key = `2_${w.week}`
                    const done = progress[key]?.completed || false
                    return (
                      <tr key={w.week} className={done ? 'opacity-60' : ''}>
                        <td className="py-2.5 pr-4">
                          <span className="font-medium text-white">Week {w.week}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-300">{w.desc}</td>
                        <td className="py-2.5 pr-4 text-center text-emerald-400">{w.sessions}×</td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => toggleWeek(2, w.week)}
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                              done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-500 hover:border-green-400'
                            }`}
                          >
                            {done && '✓'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Phase 3 */}
      {activePhase === 3 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-emerald-400 text-lg">Phase 3: Base Building</h3>
              <span className="text-xs text-gray-400">{PHASE_DATES[2]}</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              You're running continuously now! Time to build your aerobic base safely.
              By end of September, you'll be running 25–30 minutes non-stop.
            </p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { title: 'Easy Run', icon: '🐢', desc: 'Conversational pace. Can talk in full sentences. 20–35 min.', color: 'border-green-500/40' },
                  { title: 'Long Run', icon: '📏', desc: 'Longest run of the week. Add no more than 10% to last week\'s distance.', color: 'border-blue-500/40' },
                  { title: 'Tempo Effort', icon: '⚡', desc: 'Comfortably hard. Can only manage short phrases. 15–20 min.', color: 'border-emerald-500/40' },
                ].map(s => (
                  <div key={s.title} className={`bg-slate-900 border ${s.color} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{s.icon}</span>
                      <h4 className="font-semibold text-white text-sm">{s.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 rounded-lg p-3">
                <h4 className="font-semibold text-white mb-1">📏 The 10% Rule</h4>
                <p className="text-sm text-gray-300">
                  Never increase your long run by more than 10% from the previous week.
                  This is the single most important injury prevention rule for new runners.
                  If last week's long run was 3km, this week's maximum is 3.3km.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">🏆 Milestones</h4>
                <div className="space-y-2">
                  {[
                    { key: 'first_5k', label: 'First continuous 5k completed! 🎉', epic: true },
                    { key: 'run_25min', label: 'Ran 25 minutes non-stop' },
                    { key: 'run_30min', label: 'Ran 30 minutes non-stop' },
                  ].map(m => {
                    const done = milestones[m.key]?.completed || false
                    return (
                      <label key={m.key} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() => toggleMilestone(m.key, m.label)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            done ? 'bg-yellow-400 border-yellow-400 scale-110' : 'border-gray-500 group-hover:border-yellow-400'
                          }`}
                        >
                          {done && <span className="text-slate-900 text-xs font-bold">★</span>}
                        </div>
                        <span className={`text-sm font-medium ${done ? 'text-yellow-400' : 'text-gray-300'} ${m.epic ? 'text-base' : ''}`}>
                          {m.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-300">
                  <strong>Target by end of September:</strong> Comfortable 25–30 minute continuous run at easy pace.
                  You don't need to be fast — consistent and injury-free is the win.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Phase 4 */}
      {activePhase === 4 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-emerald-400 text-lg">Phase 4: 10k Prep</h3>
              <span className="text-xs text-gray-400">{PHASE_DATES[3]}</span>
            </div>

            <RaceCountdown profile={null} />

            <p className="text-gray-300 text-sm mb-4 mt-4">
              The final push. You've done the hard work — now we fine-tune and get you to that start line
              healthy and confident.
            </p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { title: 'Easy Run', icon: '🐢', desc: '30–40 min easy pace. Recovery run. Never skip the easy runs!', color: 'border-green-500/40' },
                  { title: 'Tempo Run', icon: '⚡', desc: '20–25 min. Hard but controlled. Builds race-day pace tolerance.', color: 'border-emerald-500/40' },
                  { title: 'Long Run', icon: '📏', desc: 'Build to 8–10km. Practice your race-day nutrition strategy.', color: 'border-blue-500/40' },
                ].map(s => (
                  <div key={s.title} className={`bg-slate-900 border ${s.color} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{s.icon}</span>
                      <h4 className="font-semibold text-white text-sm">{s.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 rounded-lg p-4 border border-emerald-500/30">
                <h4 className="font-bold text-emerald-400 mb-2">📉 Taper (Final 2 Weeks)</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong className="text-white">2 weeks out:</strong> Reduce total mileage by 20–30%. Keep intensity.</p>
                  <p><strong className="text-white">Race week:</strong> 2–3 short easy runs (20–30 min). No new workouts.</p>
                  <p><strong className="text-white">2 days before:</strong> Rest or very short walk only.</p>
                  <p><strong className="text-white">Day before:</strong> Full rest. Prepare kit, plan race morning.</p>
                </div>
              </div>

              <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-4">
                <p className="text-emerald-300 font-bold text-center text-lg">
                  "Finish strong, injury-free — that's the win."
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function RaceCountdown({ profile: _ }) {
  const { profile, weeksToRace } = useApp()
  const weeks = weeksToRace()

  if (weeks === null) return null

  const raceDate = profile?.target_race_date
    ? new Date(profile.target_race_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const days = profile?.target_race_date
    ? Math.max(0, Math.ceil((new Date(profile.target_race_date) - new Date()) / (24 * 60 * 60 * 1000)))
    : null

  return (
    <div className="bg-slate-900 rounded-xl p-4 text-center border border-emerald-500/30">
      <p className="text-gray-400 text-sm">Race Day Countdown</p>
      <p className="text-4xl font-bold text-emerald-400 my-1">{days}</p>
      <p className="text-gray-400 text-sm">days to go</p>
      {raceDate && <p className="text-white text-sm mt-1">{raceDate}</p>}
      <p className="text-gray-300 text-sm mt-1">{profile?.goal_event_name || 'My First Ever 10k'}</p>
    </div>
  )
}
