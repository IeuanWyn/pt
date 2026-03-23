import React from 'react'
import { useApp } from '../context/AppContext'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'plan', label: 'Plan', icon: '📋' },
  { id: 'sessions', label: 'Session Log', icon: '📝' },
  { id: 'coach', label: 'Coach', icon: '💬' },
  { id: 'profile', label: 'Profile', icon: '⚙️' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, currentPhase, phaseNames, weeksToRace } = useApp()
  const weeks = weeksToRace()
  const phase = currentPhase()

  return (
    <nav className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col py-4 min-h-full shrink-0">
      <div className="px-4 mb-4">
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Current Phase</p>
          <p className="font-semibold text-emerald-400 text-sm">Phase {phase}: {phaseNames[phase - 1]}</p>
          {weeks !== null && (
            <p className="text-xs text-gray-400 mt-1">{weeks} weeks to race</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-2 flex-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === item.id
                ? 'bg-emerald-500 text-white'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
