import React from 'react'
import { useApp } from '../context/AppContext'

export default function InjuryBanner() {
  const { dismissedInjuryBanner, setDismissedInjuryBanner } = useApp()

  if (dismissedInjuryBanner) return null

  return (
    <div className="bg-red-700 border-b border-red-600 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-red-200">⚠️</span>
        <p className="text-sm text-white font-medium">
          <strong>Calf Injury Reminder:</strong> Stop immediately if you feel any calf pain. Rest, ice, and consult your physio before continuing.
        </p>
      </div>
      <button
        onClick={() => setDismissedInjuryBanner(true)}
        className="text-red-200 hover:text-white ml-4 shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
