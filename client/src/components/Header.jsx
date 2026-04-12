import React from 'react'
import { useApp } from '../context/AppContext'

export default function Header() {
  const { syncing, syncMessage, handleSync, stravaConnected, profile, setActiveTab } = useApp()

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="18" cy="30" r="4" fill="#10b981"/>
          <path d="M 18 21 A 9 9 0 0 1 27 30" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M 18 15 A 15 15 0 0 1 33 30" stroke="#10b981" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
          <path d="M 18 9  A 21 21 0 0 1 39 30" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.3"/>
          <circle cx="65" cy="28" r="8" fill="#10b981"/>
          <line x1="64" y1="36" x2="61" y2="52" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="63" y1="42" x2="52" y2="37" stroke="#10b981" strokeWidth="4" strokeLinecap="round"/>
          <line x1="62" y1="43" x2="73" y2="38" stroke="#10b981" strokeWidth="4" strokeLinecap="round"/>
          <line x1="61" y1="52" x2="51" y2="68" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="61" y1="52" x2="71" y2="65" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round"/>
        </svg>
        <div>
          <h1 className="font-bold text-white leading-none">
            Sideline<span className="text-emerald-400">Signal</span>
          </h1>
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
