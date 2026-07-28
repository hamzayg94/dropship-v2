'use client'

import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/layout/shell'
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogRow {
  id: number
  user: string
  action: string
  entity_type: string | null
  entity_id: string | null
  detail: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  login:           'bg-emerald-50 text-emerald-700',
  logout:          'bg-slate-100 text-slate-600',
  order_updated:   'bg-blue-50 text-blue-700',
  order_deleted:   'bg-rose-50 text-rose-700',
  cost_imported:   'bg-indigo-50 text-indigo-700',
  costs_saved:        'bg-indigo-50 text-indigo-700',
  expenses_imported:  'bg-violet-50 text-violet-700',
  sync_ebay:       'bg-amber-50 text-amber-700',
  sync_finance:    'bg-amber-50 text-amber-700',
  sync_auto:       'bg-purple-50 text-purple-700',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] || 'bg-slate-100 text-slate-600'
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cls)}>{label}</span>
}

export default function LogsPage() {
  const [logs, setLogs]   = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage]   = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/logs?page=${page}`)
    const d = await r.json()
    setLogs(d.logs || [])
    setTotal(d.total || 0)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 50)

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
          <p className="text-sm text-slate-500">{total} total events recorded</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Time', 'User', 'Action', 'Order / Entity', 'Detail', 'Change'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <ScrollText size={32} className="mx-auto mb-3 text-slate-200"/>
                    <p className="text-sm text-slate-400">No activity logged yet</p>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap font-num">
                    {new Date(log.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-700 capitalize">{log.user}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action}/>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">
                    {log.entity_id || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[280px]">
                    <span className="truncate block">{log.detail || <span className="text-slate-300">—</span>}</span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[200px]">
                    {log.old_value || log.new_value ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {log.old_value && <span className="line-through text-slate-400 truncate max-w-[80px]">{log.old_value}</span>}
                        {log.old_value && log.new_value && <span className="text-slate-300">→</span>}
                        {log.new_value && <span className="text-slate-700 font-medium truncate max-w-[80px]">{log.new_value}</span>}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs">
              <ChevronLeft size={13}/> Previous
            </button>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs">
              Next <ChevronRight size={13}/>
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}
