import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Profile
export const getProfile = () => api.get('/plan/profile')
export const saveProfile = (data) => api.post('/plan/profile', data)

// Progress
export const getProgress = () => api.get('/plan/progress')
export const saveProgress = (data) => api.post('/plan/progress', data)

// Notes
export const getNotes = (type) => api.get('/plan/notes', { params: { type } })
export const saveNote = (data) => api.post('/plan/notes', data)

// Sessions
export const getSessions = (params) => api.get('/sessions', { params })
export const logSession = (data) => api.post('/sessions', data)
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data)
export const deleteSession = (id) => api.delete(`/sessions/${id}`)
export const getPersonalBests = () => api.get('/sessions/personal-bests')
export const getStats = () => api.get('/sessions/stats')

// Chat
export const getChatHistory = () => api.get('/chat/history')
export const sendMessage = (message) => api.post('/chat/message', { message })
export const clearChatHistory = () => api.delete('/chat/history')

// Strava
export const getStravaStatus = () => api.get('/strava/status')
export const getStravaAuthUrl = () => api.get('/strava/auth-url')
export const syncStrava = () => api.post('/strava/sync', {}, { timeout: 60000 })
export const disconnectStrava = () => api.post('/strava/disconnect')

// Renpho
export const getRenphoStatus = () => api.get('/renpho/status')
export const connectRenpho = (data) => api.post('/renpho/connect', data, { timeout: 60000 })
export const syncRenpho = () => api.post('/renpho/sync', {}, { timeout: 60000 })
export const disconnectRenpho = () => api.post('/renpho/disconnect')

// Health Connect
export const importHealthConnect = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/health-connect/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const getBodyMetrics = (params) => api.get('/health-connect/metrics', { params })
export const getLatestBodyMetrics = () => api.get('/health-connect/latest')

// Weather
export const getWeekWeather = () => api.get('/weather/week')

// Clear all data
export const clearAllData = () => api.delete('/data/all')
