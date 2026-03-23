import React, { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import Plan from './pages/Plan'
import SessionLog from './pages/SessionLog'
import Coach from './pages/Coach'
import Profile from './pages/Profile'
import Onboarding from './pages/Onboarding'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import InjuryBanner from './components/InjuryBanner'

function AppInner() {
  const { profile, profileLoading, activeTab } = useApp()

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your training plan...</p>
        </div>
      </div>
    )
  }

  // Show onboarding if profile doesn't exist or not complete
  if (!profile || !profile.onboarding_complete) {
    return <Onboarding />
  }

  const tabs = {
    dashboard: <Dashboard />,
    plan: <Plan />,
    sessions: <SessionLog />,
    coach: <Coach />,
    profile: <Profile />,
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <InjuryBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-4 px-4 md:px-6 pt-4">
          {tabs[activeTab] || <Dashboard />}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
