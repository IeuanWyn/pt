import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getProfile, getStravaStatus, syncStrava } from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaInfo, setStravaInfo] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [dismissedInjuryBanner, setDismissedInjuryBanner] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile()
      if (res.data.exists) {
        setProfile(res.data.profile)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const loadStravaStatus = useCallback(async () => {
    try {
      const res = await getStravaStatus()
      setStravaConnected(res.data.connected)
      setStravaInfo(res.data)
    } catch (err) {
      console.error('Failed to load Strava status:', err)
    }
  }, [])

  const handleSync = useCallback(async () => {
    if (syncing || !stravaConnected) return
    setSyncing(true)
    setSyncMessage('')
    try {
      const res = await syncStrava()
      setSyncMessage(`✓ ${res.data.message}`)
      setTimeout(() => setSyncMessage(''), 5000)
    } catch (err) {
      const msg = err.response?.data?.error || 'Sync failed'
      setSyncMessage(`⚠ ${msg}`)
      setTimeout(() => setSyncMessage(''), 8000)
    } finally {
      setSyncing(false)
    }
  }, [syncing, stravaConnected])

  useEffect(() => {
    loadProfile()
    loadStravaStatus()
  }, [])

  // Handle OAuth redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava_connected') === 'true') {
      loadStravaStatus()
      window.history.replaceState({}, '', '/')
    }
    if (params.get('strava_error')) {
      setSyncMessage(`⚠ Strava connection failed: ${params.get('strava_error')}`)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const calculateAge = (dob) => {
    if (!dob) return 34
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const weeksToRace = () => {
    if (!profile?.target_race_date) return null
    const race = new Date(profile.target_race_date)
    const today = new Date()
    const diff = race - today
    return Math.max(0, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)))
  }

  const currentPhase = () => {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    if (month <= 4) return 1
    if (month <= 6) return 2
    if (month <= 9) return 3
    return 4
  }

  const phaseNames = ['Foundation', 'Run/Walk Intro', 'Base Building', '10k Prep']

  return (
    <AppContext.Provider value={{
      profile, setProfile, profileLoading,
      stravaConnected, stravaInfo, setStravaConnected, setStravaInfo,
      syncing, syncMessage, handleSync,
      dismissedInjuryBanner, setDismissedInjuryBanner,
      activeTab, setActiveTab,
      loadProfile, loadStravaStatus,
      calculateAge, weeksToRace, currentPhase, phaseNames,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
