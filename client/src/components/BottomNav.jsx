import React from 'react'
import { useApp } from '../context/AppContext'

const navItems = [
  { id: 'dashboard', label: 'Home', icon: '📊' },
  { id: 'plan', label: 'Plan', icon: '📋' },
  { id: 'sessions', label: 'Log', icon: '📝' },
  { id: 'coach', label: 'Coach', icon: '💬' },
  { id: 'profile', label: 'Profile', icon: '⚙️' },
]

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp()

  return (
    <nav className="bg-navy-900 border-t border-navy-700 flex">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
            activeTab === item.id ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-xs leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
