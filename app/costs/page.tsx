'use client'

import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/layout/shell'
import { fmt, cn } from '@/lib/utils'
import { Package, Save, CheckCircle, AlertCircle, Upload, X, Receipt } from 'lucide-react'

interface Group {
  product: string
  order_count: number
  has_cost_count: number
  avg_price: number
  avg_payout: number
  avg_cost: number | null
  last_date: string
}

export default function CostsPage() {
  const [groups, setGroups]   = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [costs, setCosts]     = useState<Record<string, string>>({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(0)
  const [filter, setFilter]   = useState<'all' | 'missing' | 'done'>('missing')

  // AliExpress cost CSV import state
  const [importRows, setImportRows]     = useState<{order_id:string;cost:number;supplier?:string;supplier_order_id?:string}[] | null>(null)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState<{updated:number;total:number} | null>(null)
  const [importError, setImportError]   = useState<string | null>(null)

  // eBay Expenses CSV import state
  const [expPreview, setExpPreview]       = useState<{adFees:number;expenses:{month:string;category:string;description:string;amount:number}[]} | null>(null)
  const [expParsed, setExpParsed]         = useState<{ad_fees:{order_id:string;amount:number}[];monthly_expenses:{month:string;category:string;description:string;amount:number}[]} | null>(null)
  const [expImporting, setExpImporting]   = useState(false)
  const [expResult, setExpResult]         = useState<{adFeesUpdated:number;expensesUpserted:number} | null>(null)
  const [expError, setExpError]           = useState<string | null>(null)

  // ── eBay Expenses CSV parser ───────────────────────────────────────────
  const handleExpensesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExpError(null); setExpResult(null); setExpPreview(null); setExpParsed(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string

        // Quoted CSV parser
        function parseCSVLine(line: string): string[] {
          const out: string[] = []
          let cur = '', inQ = false
          for (let i = 0; i < line.length; i++) {
            const c = line[i]
            if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else inQ = !inQ }
            else if (c === ',' && !inQ) { out.push(cur.trim()); cur = '' }
            else cur += c
          }
          out.push(cur.trim())
          return out
        }

        const lines = text.split('\n')
        const headerIdx = lines.findIndex(l => l.includes('Expense date'))
        if (headerIdx === -1) throw new Error('Not a valid eBay Expenses CSV — "Expense date" column not found')

        const adFeeMap: Record<string, number> = {}
        const postageMap: Record<string, number> = {}
        const subscriptionMap: Record<string, {description:string; amount:number}> = {}

        for (let i = headerIdx + 1; i < lines.length; i++) {
          const row = parseCSVLine(lines[i])
          if (row.length < 9) continue
          const [dateRaw, grouping, category, type, , orderNum, , , amtStr] = row
          const amount = Math.abs(parseFloat(amtStr) || 0)
          if (amount === 0) continue

          // Parse month from date like "Jul 01,2026"
          const dateClean = dateRaw.replace(/"/g, '').trim()
          const dateParsed = new Date(dateClean.replace(',', ' '))
          const month = isNaN(dateParsed.getTime()) ? '' : `${dateParsed.getFullYear()}-${String(dateParsed.getMonth()+1).padStart(2,'0')}`
          if (!month) continue

          const isCredit = row[4]?.trim().toLowerCase() === 'credit'
          const sign = isCredit ? 1 : -1  // credits reduce the fee

          // Promoted Listings ad fee — per order
          if (category === 'Ad fees' && orderNum && orderNum !== '--') {
            adFeeMap[orderNum] = (adFeeMap[orderNum] || 0) + (amount * (isCredit ? -1 : 1))
          }

          // Shop subscription
          if (grouping === 'Fees' && category === 'Other fees' && type?.includes('Subscription')) {
            const existing = subscriptionMap[month]
            subscriptionMap[month] = {
              description: type.trim(),
              amount: (existing?.amount || 0) + amount * (isCredit ? -1 : 1),
            }
          }

          // Postage labels
          if (grouping === 'Postage labels') {
            postageMap[month] = (postageMap[month] || 0) + amount * (isCredit ? -1 : 1)
          }

          void sign
        }

        // Build structured payload
        const adFees = Object.entries(adFeeMap)
          .map(([order_id, amount]) => ({ order_id, amount: Math.max(0, amount) }))
          .filter(r => r.amount > 0)

        const monthly_expenses: {month:string;category:string;description:string;amount:number}[] = []
        for (const [month, {description, amount}] of Object.entries(subscriptionMap)) {
          if (amount > 0) monthly_expenses.push({ month, category: 'subscription', description, amount })
        }
        for (const [month, amount] of Object.entries(postageMap)) {
          if (amount > 0) monthly_expenses.push({ month, category: 'postage', description: 'eBay Postage Labels', amount })
        }

        if (adFees.length === 0 && monthly_expenses.length === 0)
          throw new Error('No usable data found — check this is an eBay Expenses CSV')

        setExpParsed({ ad_fees: adFees, monthly_expenses })
        setExpPreview({ adFees: adFees.length, expenses: monthly_expenses })
      } catch (err) {
        setExpError((err as Error).message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExpensesImport = async () => {
    if (!expParsed) return
    setExpImporting(true); setExpError(null)
    const r = await fetch('/api/expenses/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expParsed),
    })
    const d = await r.json()
    setExpImporting(false)
    if (d.error) { setExpError(d.error); return }
    setExpResult({ adFeesUpdated: d.adFeesUpdated, expensesUpserted: d.expensesUpserted })
    setExpParsed(null); setExpPreview(null)
  }

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text  = ev.target?.result as string
        const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
        if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''))
        const idIdx   = headers.findIndex(h => h === 'order_id' || h === 'id')
        const costIdx = headers.findIndex(h => h === 'cost')
        const supIdx  = headers.findIndex(h => h === 'supplier')
        const sidIdx  = headers.findIndex(h => h === 'supplier_order_id' || h === 'supplier_id')

        if (idIdx === -1 || costIdx === -1)
          throw new Error('CSV must have "order_id" and "cost" columns')

        const rows = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g,''))
          return {
            order_id:          cols[idIdx]  || '',
            cost:              Number(cols[costIdx]) || 0,
            supplier:          supIdx >= 0 ? cols[supIdx] : undefined,
            supplier_order_id: sidIdx >= 0 ? cols[sidIdx] : undefined,
          }
        }).filter(r => r.order_id && r.cost > 0)

        if (rows.length === 0) throw new Error('No valid rows found (order_id and cost > 0 required)')
        setImportRows(rows)
      } catch (err) {
        setImportError((err as Error).message)
        setImportRows(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!importRows) return
    setImporting(true)
    setImportError(null)
    const r = await fetch('/api/orders/import-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importRows),
    })
    const d = await r.json()
    if (d.error) { setImportError(d.error); setImporting(false); return }
    setImportResult({ updated: d.updated, total: d.total })
    setImportRows(null)
    setImporting(false)
    load()
  }

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/costs')
    const d = await r.json()
    setGroups(d.groups || [])
    // Pre-fill existing avg costs
    const pre: Record<string, string> = {}
    for (const g of (d.groups || []) as Group[]) {
      if (g.avg_cost && g.has_cost_count === g.order_count) {
        pre[g.product] = g.avg_cost.toFixed(2)
      }
    }
    setCosts(pre)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    const assignments = Object.entries(costs)
      .filter(([, v]) => v && Number(v) > 0)
      .map(([product, cost]) => ({ product, cost: Number(cost) }))

    const r = await fetch('/api/costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    })
    const d = await r.json()
    setSaved(d.updated || 0)
    setSaving(false)
    load()
  }

  const filtered = groups.filter(g => {
    if (filter === 'missing') return g.has_cost_count < g.order_count
    if (filter === 'done')    return g.has_cost_count === g.order_count && g.has_cost_count > 0
    return true
  })

  const missingCount = groups.filter(g => g.has_cost_count < g.order_count).length
  const pendingInput = Object.values(costs).filter(v => v && Number(v) > 0).length

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cost Entry</h1>
          <p className="text-sm text-slate-500">
            Assign supplier cost per product — applies to all matching orders at once
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle size={15}/> {saved} orders updated
            </div>
          )}
          <button onClick={handleSave} disabled={saving || pendingInput === 0} className="btn-primary">
            <Save size={14}/>
            {saving ? 'Saving…' : `Save ${pendingInput > 0 ? `(${pendingInput})` : 'Costs'}`}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Products</p>
          <p className="text-2xl font-bold font-num text-slate-900">{groups.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Missing Cost</p>
          <p className={`text-2xl font-bold font-num ${missingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {missingCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Fully Costed</p>
          <p className="text-2xl font-bold font-num text-emerald-600">
            {groups.filter(g => g.has_cost_count === g.order_count && g.has_cost_count > 0).length}
          </p>
        </div>
      </div>

      {/* CSV Import */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Import Costs from CSV</p>
            <p className="text-xs text-slate-500">Required: <code className="bg-slate-100 px-1 rounded">order_id</code> <code className="bg-slate-100 px-1 rounded">cost</code> — Optional: <code className="bg-slate-100 px-1 rounded">supplier</code> <code className="bg-slate-100 px-1 rounded">supplier_order_id</code></p>
          </div>
          <label className="btn-secondary text-sm cursor-pointer">
            <Upload size={13}/> Choose CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvFile}/>
          </label>
        </div>

        {importError && (
          <div className="flex items-center gap-2 mt-2 p-2.5 bg-rose-50 rounded-lg text-xs text-rose-700">
            <X size={13}/> {importError}
          </div>
        )}

        {importRows && (
          <div className="flex items-center justify-between mt-2 p-2.5 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-700">
              <strong>{importRows.length} orders</strong> ready to import
              <span className="text-indigo-400 ml-1">(only updates orders with £0 cost)</span>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setImportRows(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={handleImport} disabled={importing} className="btn-primary text-xs">
                {importing ? 'Importing…' : 'Import Now'}
              </button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-50 rounded-lg text-xs text-emerald-700">
            <CheckCircle size={13}/>
            <strong>{importResult.updated}</strong> orders updated from {importResult.total} rows in CSV
          </div>
        )}
      </div>

      {/* eBay Expenses CSV Import */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Receipt size={14} className="text-indigo-500"/> Import eBay Expenses CSV
            </p>
            <p className="text-xs text-slate-500">
              Download from eBay Seller Hub → Payments → Reports → Expense Report.
              Imports ad fees per order + subscription &amp; postage overheads into P&amp;L.
            </p>
          </div>
          <label className="btn-secondary text-sm cursor-pointer">
            <Upload size={13}/> Choose CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleExpensesFile}/>
          </label>
        </div>

        {expError && (
          <div className="flex items-center gap-2 mt-2 p-2.5 bg-rose-50 rounded-lg text-xs text-rose-700">
            <X size={13}/> {expError}
          </div>
        )}

        {expPreview && expParsed && (
          <div className="mt-2 p-2.5 bg-indigo-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-xs text-indigo-700 space-y-0.5">
                <p><strong>{expPreview.adFees}</strong> orders with ad fees found</p>
                {expPreview.expenses.map((e, i) => (
                  <p key={i} className="text-indigo-500">
                    {e.category === 'subscription' ? '📋' : '📦'} {e.description} — <strong>£{e.amount.toFixed(2)}</strong> ({e.month})
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button onClick={() => { setExpParsed(null); setExpPreview(null) }} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                <button onClick={handleExpensesImport} disabled={expImporting} className="btn-primary text-xs">
                  {expImporting ? 'Importing…' : 'Import Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {expResult && (
          <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-50 rounded-lg text-xs text-emerald-700">
            <CheckCircle size={13}/>
            <strong>{expResult.adFeesUpdated}</strong> orders updated with ad fees ·{' '}
            <strong>{expResult.expensesUpserted}</strong> overhead lines saved to P&amp;L
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
        {(['missing', 'done', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-4 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
              filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {f === 'missing' ? `Missing Cost (${missingCount})` : f === 'done' ? 'Costed' : 'All Products'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Costed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Sale Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Payout</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier Cost (£)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Margin</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:6}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({length:7}).map((_,j)=>(
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(g => {
                const enteredCost = Number(costs[g.product] || 0)
                const margin = g.avg_payout > 0 && enteredCost > 0
                  ? ((g.avg_payout - enteredCost) / g.avg_payout) * 100
                  : null

                return (
                  <tr key={g.product} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="text-xs font-medium text-slate-800 truncate">{g.product}</p>
                      <p className="text-[10px] text-slate-400">Last order: {g.last_date}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{g.order_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {g.has_cost_count === g.order_count && g.has_cost_count > 0
                          ? <CheckCircle size={13} className="text-emerald-500"/>
                          : <AlertCircle size={13} className="text-amber-400"/>}
                        <span className="text-xs text-slate-500">{g.has_cost_count}/{g.order_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(g.avg_price)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(g.avg_payout)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">£</span>
                        <input
                          type="number" step="0.01" min="0"
                          className={cn('w-24 text-xs px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-num',
                            costs[g.product] ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200')}
                          placeholder={g.avg_cost ? g.avg_cost.toFixed(2) : '0.00'}
                          value={costs[g.product] || ''}
                          onChange={e => setCosts(prev => ({ ...prev, [g.product]: e.target.value }))}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {margin !== null ? (
                        <span className={cn('badge text-xs',
                          margin >= 20 ? 'bg-emerald-50 text-emerald-700' :
                          margin >= 0  ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600')}>
                          {margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package size={32} className="mb-3 opacity-30"/>
            <p className="text-sm">No products in this view</p>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-xs text-indigo-700">
          <strong>Tip:</strong> Enter the supplier cost per unit (what you paid, not the sale price).
          Saving will apply the cost to all orders for that product that currently have £0 cost.
          Existing manually-set costs won't be overwritten.
        </p>
      </div>
    </Shell>
  )
}
