'use client'

import { useState, useRef, useEffect } from 'react'
import Shell from '@/components/layout/shell'
import { cn } from '@/lib/utils'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'

interface Msg { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  "What's my best performing product this year?",
  "Which products are losing money? What price should I set?",
  "I sold 5 Solar Garden Lights to UK buyers yesterday, cost £3.80 each, order IDs 12-345 through 12-349",
  "Compare my UK vs international margins",
  "What products should I launch next based on my profitable patterns?",
  "Why was last month worse than the month before?",
]

function MsgBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex items-start gap-3', isUser ? 'flex-row-reverse' : '')}>
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-indigo-100' : 'bg-slate-100')}>
        {isUser ? <User size={14} className="text-indigo-600"/> : <Bot size={14} className="text-slate-600"/>}
      </div>
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm')}>
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < msg.content.split('\n').length - 1 ? <br/> : null}</span>
        ))}
      </div>
    </div>
  )
}

export default function AiPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [ordersCreated, setOrdersCreated] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Msg = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const d = await r.json()
      if (d.ordersCreated > 0) setOrdersCreated(c => c + d.ordersCreated)
      setMessages(prev => [...prev, { role: 'assistant', content: d.text || d.error || 'No response' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to AI. Check your API key in settings.' }])
    }
    setLoading(false)
  }

  return (
    <Shell>
      <div className="flex flex-col h-[calc(100vh-96px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Assistant</h1>
            <p className="text-sm text-slate-500">Ask about your business, log orders conversationally, get pricing advice</p>
          </div>
          <div className="flex items-center gap-2">
            {ordersCreated > 0 && (
              <span className="badge bg-emerald-50 text-emerald-700 text-xs">{ordersCreated} orders logged</span>
            )}
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setOrdersCreated(0) }} className="btn-secondary text-xs">
                <RefreshCw size={12}/> New Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="card flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Sparkles size={24} className="text-indigo-500"/>
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Your Business AI</h3>
                <p className="text-sm text-slate-500 text-center max-w-md mb-8">
                  I have access to all your order data, P&L, and margins. Ask me anything or log your backlog orders conversationally.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left px-3 py-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors leading-snug">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => <MsgBubble key={i} msg={m}/>)
            )}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-slate-600"/>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-end gap-3">
              <textarea
                rows={2}
                className="input resize-none flex-1 text-sm"
                placeholder='Ask a question or log orders: "I sold 3 Solar Lights to Germany, order 12-345, cost £4.20, payout £11.50"'
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="btn-primary h-[60px] px-5 flex-shrink-0">
                <Send size={16}/>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Enter to send · Shift+Enter for new line · Orders you describe are auto-logged to the database
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}
