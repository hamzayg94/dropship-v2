'use client'

import { useEffect, useState, useRef } from 'react'
import Shell from '@/components/layout/shell'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, AlertTriangle,
  Clock, ExternalLink, Bot, Send, Loader2, CheckCheck, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subtask {
  id: number
  step_order: number
  label: string
  detail: string
  done: boolean
  done_at: string | null
}

interface Obligation {
  id: string
  title: string
  description: string
  category: string
  frequency: string
  period: string
  due_date: string
  submit_to: string
  submit_url: string
  sort_order: number
  completed: boolean
  completed_at: string | null
  notes: string
  subtasks: Subtask[]
  progress: { done: number; total: number }
  daysUntil: number
  urgency: 'done' | 'overdue' | 'urgent' | 'soon' | 'ok'
}

interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  tax: 'Tax', legal: 'Legal', accounting: 'Accounting', internal: 'Internal',
}
const CATEGORY_COLOR: Record<string, string> = {
  tax:        'bg-rose-50 text-rose-700',
  legal:      'bg-purple-50 text-purple-700',
  accounting: 'bg-blue-50 text-blue-700',
  internal:   'bg-slate-100 text-slate-600',
}
const URGENCY_CONFIG = {
  overdue: { bar: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700',   border: 'border-rose-200', label: 'OVERDUE' },
  urgent:  { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200', label: 'DUE SOON' },
  soon:    { bar: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200', label: 'UPCOMING' },
  ok:      { bar: 'bg-slate-200',  badge: 'bg-slate-100 text-slate-600',  border: 'border-slate-200', label: '' },
  done:    { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100', label: 'COMPLETE' },
}

function fmtDueDate(due: string) {
  return new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DaysChip({ ob }: { ob: Obligation }) {
  if (ob.completed) {
    const d = ob.completed_at
      ? new Date(ob.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : ''
    return <span className="text-xs text-emerald-600 font-medium">Completed {d}</span>
  }
  if (ob.daysUntil < 0) return <span className="text-xs font-semibold text-rose-600">{Math.abs(ob.daysUntil)} days overdue</span>
  if (ob.daysUntil === 0) return <span className="text-xs font-semibold text-rose-600">Due today</span>
  return <span className="text-xs text-slate-500">{ob.daysUntil} days remaining</span>
}

// ─── Obligation Card ──────────────────────────────────────────────────────────

function ObligationCard({
  ob, onSubtaskToggle, onComplete,
}: {
  ob: Obligation
  onSubtaskToggle: (obId: string, stId: number, done: boolean) => void
  onComplete: (obId: string) => void
}) {
  const [open, setOpen]               = useState(false)
  const [chatOpen, setChatOpen]       = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput]     = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [expandedDetail, setExpandedDetail] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const cfg = URGENCY_CONFIG[ob.urgency]
  const allDone = ob.subtasks.length > 0 && ob.subtasks.every(s => s.done)
  const pct = ob.subtasks.length > 0 ? Math.round((ob.progress.done / ob.progress.total) * 100) : 0

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: chatInput.trim() }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/compliance/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId: ob.id, messages: newMessages }),
      })
      const data = await res.json() as { text?: string; error?: string }
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.text || 'Sorry, I could not get a response. Please try again.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error — please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className={cn('card border overflow-hidden transition-all', cfg.border)}>
      {/* Urgency bar */}
      <div className={cn('h-1 w-full', cfg.bar)} />

      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
      >
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {ob.completed
            ? <CheckCircle2 size={20} className="text-emerald-500" />
            : ob.urgency === 'overdue' || ob.urgency === 'urgent'
              ? <AlertTriangle size={20} className="text-rose-500" />
              : <Clock size={20} className="text-slate-400" />
          }
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={cn('font-semibold text-sm', ob.completed ? 'text-slate-400 line-through' : 'text-slate-900')}>
              {ob.title}
            </h3>
            {cfg.label && (
              <span className={cn('text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', cfg.badge)}>
                {cfg.label}
              </span>
            )}
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', CATEGORY_COLOR[ob.category])}>
              {CATEGORY_LABEL[ob.category]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>Due: <strong className="text-slate-700">{fmtDueDate(ob.due_date)}</strong></span>
            <span>→ {ob.submit_to}</span>
            <DaysChip ob={ob} />
          </div>
          {/* Progress bar */}
          {ob.subtasks.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', ob.completed ? 'bg-emerald-500' : 'bg-indigo-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 font-num flex-shrink-0">
                {ob.progress.done}/{ob.progress.total} steps
              </span>
            </div>
          )}
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 text-slate-400 mt-0.5">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-slate-100 px-5 pb-5">
          {/* Description */}
          <p className="text-sm text-slate-600 mt-4 mb-4 leading-relaxed">{ob.description}</p>

          {/* Submit link */}
          {ob.submit_url && (
            <a
              href={ob.submit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 mb-4 font-medium"
            >
              <ExternalLink size={12} />
              Open {ob.submit_to}
            </a>
          )}

          {/* Subtasks */}
          {ob.subtasks.length > 0 && (
            <div className="space-y-1 mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Steps to complete</p>
              {ob.subtasks.map(st => (
                <div key={st.id} className="group">
                  <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <button
                      onClick={() => onSubtaskToggle(ob.id, st.id, !st.done)}
                      disabled={ob.completed}
                      className="mt-0.5 flex-shrink-0 disabled:opacity-40"
                    >
                      {st.done
                        ? <CheckCircle2 size={17} className="text-emerald-500" />
                        : <Circle size={17} className="text-slate-300 hover:text-indigo-400 transition-colors" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'text-sm leading-relaxed',
                        st.done ? 'line-through text-slate-400' : 'text-slate-700',
                      )}>
                        {st.label}
                      </span>
                      {/* Detail toggle */}
                      {st.detail && (
                        <>
                          <button
                            onClick={() => setExpandedDetail(expandedDetail === st.id ? null : st.id)}
                            className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-indigo-500 hover:text-indigo-700"
                          >
                            <Info size={10} />
                            {expandedDetail === st.id ? 'hide' : 'how?'}
                          </button>
                          {expandedDetail === st.id && (
                            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed bg-slate-50 rounded p-2.5 border border-slate-100">
                              {st.detail}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {st.done_at && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                        {new Date(st.done_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {!ob.completed && (
              <button
                onClick={() => onComplete(ob.id)}
                disabled={!allDone}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  allDone
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                )}
              >
                <CheckCheck size={15} />
                {allDone ? 'Mark Obligation Complete' : `Complete all ${ob.progress.total - ob.progress.done} remaining steps first`}
              </button>
            )}
            <button
              onClick={() => {
                setChatOpen(c => !c)
                if (chatMessages.length === 0 && !chatOpen) {
                  setChatMessages([{
                    role: 'assistant',
                    content: `Hi! I'm here to help you with **${ob.title}**. Ask me anything — what a step means, where to find information, or what to do next.`,
                  }])
                }
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                chatOpen
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50',
              )}
            >
              <Bot size={15} />
              {chatOpen ? 'Hide AI Assistant' : 'Ask AI Assistant'}
            </button>
          </div>

          {/* AI Chat panel */}
          {chatOpen && (
            <div className="mt-4 border border-indigo-100 rounded-xl overflow-hidden bg-slate-50">
              {/* Chat messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm',
                    )}>
                      {msg.content.split('\n').map((line, j) => (
                        <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
                      <Loader2 size={14} className="text-slate-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="border-t border-indigo-100 p-3 flex gap-2 bg-white">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="Ask a question about this obligation…"
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors text-sm font-medium"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [completing, setCompleting]   = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/compliance')
      const data = await res.json() as { obligations?: Obligation[]; error?: string }
      if (data.error) throw new Error(data.error)
      setObligations(data.obligations || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubtaskToggle(obId: string, stId: number, done: boolean) {
    // Optimistic update
    setObligations(prev => prev.map(ob => {
      if (ob.id !== obId) return ob
      const subtasks = ob.subtasks.map(st => st.id === stId ? { ...st, done } : st)
      const doneSubs = subtasks.filter(s => s.done).length
      return { ...ob, subtasks, progress: { done: doneSubs, total: subtasks.length } }
    }))

    await fetch(`/api/compliance/${obId}/subtask/${stId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    })
  }

  async function handleComplete(obId: string) {
    setCompleting(obId)
    try {
      const res = await fetch(`/api/compliance/${obId}/complete`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.error) { alert(data.error); return }
      await load()
    } finally {
      setCompleting(null)
    }
  }

  const active    = obligations.filter(o => !o.completed)
  const completed = obligations.filter(o => o.completed)
  const alerts    = active.filter(o => o.urgency === 'overdue' || o.urgency === 'urgent')

  const sorted = [...active].sort((a, b) => {
    const order = { overdue: 0, urgent: 1, soon: 2, ok: 3, done: 4 }
    return order[a.urgency] - order[b.urgency] || a.due_date.localeCompare(b.due_date)
  })

  if (loading) return (
    <Shell>
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading compliance data…
      </div>
    </Shell>
  )

  if (error) return (
    <Shell>
      <div className="flex items-center justify-center h-64 text-rose-500">
        Error: {error}
      </div>
    </Shell>
  )

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Compliance & Legal Obligations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            THE LIFESTYLE TRADING COMPANY LTD · 17097033 · Year-end 31 March 2027
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">
            {completed.length}/{obligations.length} obligations complete
          </p>
          <div className="mt-1 w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-auto">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${obligations.length > 0 ? (completed.length / obligations.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-700 font-medium">
            {alerts.length === 1
              ? `1 obligation needs urgent attention`
              : `${alerts.length} obligations need urgent attention`}
          </p>
        </div>
      )}

      {/* Active obligations */}
      {sorted.length > 0 && (
        <div className="space-y-3 mb-8">
          {completing && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Saving…
            </div>
          )}
          {sorted.map(ob => (
            <ObligationCard
              key={ob.id}
              ob={ob}
              onSubtaskToggle={handleSubtaskToggle}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Completed obligations */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Completed Obligations
          </p>
          <div className="space-y-2">
            {completed.map(ob => (
              <ObligationCard
                key={ob.id}
                ob={ob}
                onSubtaskToggle={handleSubtaskToggle}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {obligations.length === 0 && (
        <div className="text-center py-16 text-slate-400">No compliance obligations found.</div>
      )}
    </Shell>
  )
}
