import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { getChatHistory, sendMessage, clearChatHistory } from '../api'
import { useApp } from '../context/AppContext'
import Card from '../components/Card'

const QUICK_ACTIONS = [
  { label: 'Suggest plan adjustment', icon: '📊', prompt: 'Please review my recent Strava activity and recommend any changes to my training plan. Consider my calf injury history and overall progress.' },
  { label: 'How am I doing?', icon: '💪', prompt: 'How am I doing overall with my 10k training? Give me an honest assessment of my progress and what I should focus on next.' },
  { label: 'Calf is hurting', icon: '🚨', prompt: 'My calf is hurting after my last session. What should I do? How serious is this and when can I run again?' },
]

function isBirthday() {
  const today = new Date()
  // DOB is 07/10/1991 — October 7th
  return today.getMonth() === 9 && today.getDate() === 7
}

export default function Coach() {
  const { profile, currentPhase, phaseNames, weeksToRace } = useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const phase = currentPhase()
  const weeks = weeksToRace()

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const loadHistory = async () => {
    try {
      const res = await getChatHistory()
      setMessages(res.data)

      // If it's a birthday and no messages, send birthday greeting automatically
      if (res.data.length === 0 && isBirthday()) {
        handleSend("It's my birthday today!")
        return
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (overrideMessage = null) => {
    const msg = (overrideMessage || input).trim()
    if (!msg || sending) return

    setInput('')
    setError('')
    setSending(true)

    // Optimistically add user message
    const tempUserMsg = { id: Date.now(), role: 'user', content: msg, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await sendMessage(msg)
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.response,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setError('Failed to get response from coach. Please try again.')
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = async () => {
    try {
      await clearChatHistory()
      setMessages([])
      setShowClearConfirm(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 h-full">
      {/* Context summary */}
      <Card>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-400">Phase: </span>
            <span className="text-emerald-400 font-medium">{phase} — {phaseNames[phase - 1]}</span>
          </div>
          {weeks !== null && (
            <div>
              <span className="text-gray-400">Race: </span>
              <span className="text-white font-medium">{weeks} weeks</span>
            </div>
          )}
          <div>
            <span className="text-gray-400">Coach: </span>
            <span className="text-green-400 font-medium">Claude AI ●</span>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.label}
            onClick={() => handleSend(action.prompt)}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl flex flex-col" style={{ minHeight: '400px', maxHeight: '60vh' }}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-white font-semibold mb-1">Hi! I'm your running coach.</p>
              <p className="text-gray-400 text-sm">Ask me anything about your training plan, recovery, or how to progress safely with your calf injury.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-white rounded-tr-sm'
                    : 'bg-slate-900 text-gray-100 rounded-tl-sm border border-slate-600'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="chat-content prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className="text-xs mt-1 opacity-50 text-right">
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-600 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-t border-red-800">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-slate-700 p-3">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your coach anything..."
              rows={2}
              disabled={sending}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-emerald-500 placeholder-gray-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors self-end"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</p>
            {messages.length > 0 && (
              showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Clear history?</span>
                  <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300">Yes</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-xs text-gray-400 hover:text-gray-300">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear history
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
