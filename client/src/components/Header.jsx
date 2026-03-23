import React from 'react'
import { useApp } from '../context/AppContext'

export default function Header() {
  const { syncing, syncMessage, handleSync, stravaConnected, profile, setActiveTab } = useApp()

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏃</span>
        <div>
          <h1 className="font-bold text-white leading-none">10k Training</h1>
          {profile?.name && (
            <p className="text-xs text-gray-400">{profile.name}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {syncMessage && (
          <span className={`text-xs px-2 py-1 rounded ${syncMessage.startsWith('✓') ? 'text-green-400' : 'text-yellow-400'}`}>
            {syncMessage}
          </span>
        )}

        {stravaConnected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: syncing ? '#9b4a23' : '#FC4C02', color: 'white' }}
          >
            {syncing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                <span className="hidden sm:inline">Sync Strava</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('coach')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span>💬</span>
          <span className="hidden sm:inline">Coach</span>
        </button>
      </div>
    </header>
  )
}
