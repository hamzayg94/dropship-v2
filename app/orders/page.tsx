'use client'

import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/layout/shell'
import { fmt, STATUS_COLORS, cn, COUNTRY_NAMES } from '@/lib/utils'
import type { OrderRow } from '@/lib/db'
import { Search, Plus, RefreshCw, ChevronLeft, ChevronRight, X, Save, Trash2, Download } from 'lucide-react'

const STATUSES = ['Completed','Dispatched','In Progress','Label Created','Refunded','Partial Refund','Refunded - Awaiting Supplier Refund','Cancelled']
const KNOWN_SUPPLIERS = ['AliExpress', 'Amazon', 'Temu']

interface Paged { orders: OrderRow[]; total: number; page: number; limit: number }

function OrderModal({ order, onClose, onSave }: {
  order: OrderRow | null
  onClose: () => void
  onSave: () => void
}) {
  const blank: Partial<OrderRow> = {
    id:'', date: new Date().toISOString().split('T')[0], product:'', buyer:'',
    postcode:'', country:'', country_code:'', quantity:1, variation:'',
    price:0, payout:0, cost:0, fvf:0, ad_fee:0,
    status:'Completed', supplier:'', tracking:'', dispatch:'', notes:'',
  }
  const [f, setF] = useState<Partial<OrderRow>>(order ? { ...order } : blank)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Track whether "Other" is selected in the supplier dropdown
  const [supplierOther, setSupplierOther] = useState(
    !!order?.supplier && !KNOWN_SUPPLIERS.includes(order.supplier)
  )

  const set = (k: keyof OrderRow, v: unknown) => setF(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const url    = order ? `/api/orders/${order.id}` : '/api/orders'
    const method = order ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(f) })
    setSaving(false)
    onSave()
    onClose()
  }

  const handleDelete = async () => {
    if (!order || !confirm('Delete this order?')) return
    setDeleting(true)
    await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
    setDeleting(false)
    onSave()
    onClose()
  }

  const payout = Number(f.payout || 0)
  const cost   = Number(f.cost   || 0)
  const profit = payout - cost
  const margin = payout > 0 ? (profit / payout) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 backdrop-blur-sm">
      <div className="h-full w-[480px] bg-white border-l border-slate-200 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{order ? 'Edit Order' : 'New Order'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Live P&L preview */}
          {(payout > 0 || cost > 0) && (
            <div className={cn('rounded-lg p-3 text-sm', margin >= 20 ? 'bg-emerald-50' : margin >= 0 ? 'bg-amber-50' : 'bg-rose-50')}>
              <div className="flex justify-between">
                <span className="text-slate-600">Profit</span>
                <span className={cn('font-num font-semibold', margin >= 20 ? 'text-emerald-700' : margin >= 0 ? 'text-amber-700' : 'text-rose-600')}>
                  {fmt(profit)} ({margin.toFixed(1)}%)
                </span>
              </div>
              {margin < 20 && cost > 0 && payout > 0 && (
                <p className="text-xs mt-1 text-amber-700">
                  Min price for 20% margin: {fmt(cost / 0.80 / (1 - 0.109))}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Order ID *</label>
              <input className="input" value={f.id || ''} onChange={e => set('id', e.target.value)} placeholder="e.g. 12-34567-89012"/>
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={f.date || ''} onChange={e => set('date', e.target.value)}/>
            </div>
          </div>

          <div>
            <label className="label">Product *</label>
            <input className="input" value={f.product || ''} onChange={e => set('product', e.target.value)} placeholder="Product title"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Buyer</label>
              <input className="input" value={f.buyer || ''} onChange={e => set('buyer', e.target.value)}/>
            </div>
            <div>
              <label className="label">Postcode</label>
              <input className="input" value={f.postcode || ''} onChange={e => set('postcode', e.target.value)}/>
            </div>
          </div>

          <div>
            <label className="label">Country</label>
            <select className="input" value={f.country_code || ''} onChange={e => {
              const code = e.target.value
              set('country_code', code)
              set('country', code ? COUNTRY_NAMES[code] || code : '')
            }}>
              <option value="">— Select country —</option>
              {Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Sale Price (£)</label>
              <input className="input" type="number" step="0.01" value={f.price || ''} onChange={e => set('price', parseFloat(e.target.value)||0)}/>
            </div>
            <div>
              <label className="label">Net Payout (£)</label>
              <input className="input" type="number" step="0.01" value={f.payout || ''} onChange={e => set('payout', parseFloat(e.target.value)||0)}/>
            </div>
            <div>
              <label className="label">Supplier Cost (£)</label>
              <input className="input" type="number" step="0.01" value={f.cost || ''} onChange={e => set('cost', parseFloat(e.target.value)||0)}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">FVF (£)</label>
              <input className="input" type="number" step="0.01" value={f.fvf || ''} onChange={e => set('fvf', parseFloat(e.target.value)||0)}/>
            </div>
            <div>
              <label className="label">Ad Fee (£)</label>
              <input className="input" type="number" step="0.01" value={f.ad_fee || ''} onChange={e => set('ad_fee', parseFloat(e.target.value)||0)}/>
            </div>
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={f.status || 'Completed'} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" step="1"
                value={f.quantity ?? 1} onChange={e => set('quantity', parseInt(e.target.value)||1)}/>
            </div>
            <div>
              <label className="label">Tracking</label>
              <input className="input" value={f.tracking || ''} onChange={e => set('tracking', e.target.value)}/>
            </div>
          </div>

          <div>
            <label className="label">Variation</label>
            <input className="input" value={f.variation || ''} onChange={e => set('variation', e.target.value)}
              placeholder="e.g. Colour: Blue, Size: Large"/>
          </div>

          <div>
            <label className="label">Supplier</label>
            <select className="input"
              value={supplierOther ? 'Other' : (f.supplier || '')}
              onChange={e => {
                if (e.target.value === 'Other') {
                  setSupplierOther(true)
                  set('supplier', '')
                } else {
                  setSupplierOther(false)
                  set('supplier', e.target.value)
                }
              }}>
              <option value="">— Select supplier —</option>
              {KNOWN_SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Other">Other</option>
            </select>
            {supplierOther && (
              <input className="input mt-2" placeholder="Enter supplier name"
                value={f.supplier || ''} onChange={e => set('supplier', e.target.value)}/>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier Order ID</label>
              <input className="input" value={f.supplier_order_id || ''} onChange={e => set('supplier_order_id', e.target.value)}
                placeholder="e.g. 3072515593516130"/>
            </div>
            <div>
              <label className="label">Dispatch Date</label>
              <input className="input" type="date" value={f.dispatch || ''} onChange={e => set('dispatch', e.target.value)}/>
            </div>
          </div>

          <div>
            <label className="label">Supplier Link</label>
            <input className="input" value={f.supplier_link || ''} onChange={e => set('supplier_link', e.target.value)}
              placeholder="https://www.aliexpress.com/item/..."/>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={f.notes || ''} onChange={e => set('notes', e.target.value)}/>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          {order ? (
            <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs px-3 py-1.5">
              <Trash2 size={13}/> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : <div/>}
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={14}/> {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [data, setData]       = useState<Paged | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [page, setPage]       = useState(1)
  const [selected, setSelected] = useState<OrderRow | null | 'new'>(null)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (status !== 'all') params.set('status', status)
    if (search) params.set('q', search)
    const r = await fetch(`/api/orders?${params}`)
    const d = await r.json()
    setData(d)
    setLoading(false)
  }, [page, status, search])

  useEffect(() => { load() }, [load])

  const syncEbay = async () => {
    setSyncing(true)
    await fetch('/api/sync/fulfillment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' })
    setSyncing(false)
    load()
  }

  const totalPages = data ? Math.ceil(data.total / 50) : 1

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">{data?.total ?? '…'} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncEbay} disabled={syncing} className="btn-secondary text-sm">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''}/>
            {syncing ? 'Syncing…' : 'Sync eBay'}
          </button>
          <a href="/api/orders/export" download className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={14}/> Export CSV
          </a>
          <button onClick={() => setSelected('new')} className="btn-primary">
            <Plus size={14}/> New Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-8" placeholder="Search orders, products, buyers…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/>
        </div>
        <select className="input w-auto text-sm"
          value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="all">All Statuses</option>
          <option value="missing_cost">⚠ Missing Cost</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || status !== 'all') && (
          <button className="btn-secondary text-sm" onClick={() => { setSearch(''); setStatus('all'); setPage(1) }}>
            <X size={13}/> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Date','Order ID','Product','Buyer','Country','Status','Sale Price','Net Payout','Cost','Profit','Margin'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:8}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({length:11}).map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : data?.orders.map(o => {
                const payout = Number(o.payout || 0)
                const cost   = Number(o.cost   || 0)
                const profit = payout - cost
                const margin = payout > 0 ? (profit / payout) * 100 : 0
                return (
                  <tr key={o.id} onClick={() => setSelected(o)}
                    className="border-b border-slate-50 hover:bg-slate-50/70 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 font-num whitespace-nowrap">{o.date}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">{o.id}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs font-medium text-slate-800 truncate">{o.product || '—'}</p>
                      {o.supplier && <p className="text-[10px] text-slate-400">{o.supplier}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{o.buyer || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{o.country || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`badge ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700 whitespace-nowrap">{fmt(Number(o.price||0))}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700 whitespace-nowrap">{fmt(payout)}</td>
                    <td className="px-4 py-3 text-xs font-num whitespace-nowrap">
                      {cost > 0 ? <span className="text-slate-700">{fmt(cost)}</span> : <span className="text-amber-500">Missing</span>}
                    </td>
                    <td className={`px-4 py-3 text-xs font-num font-semibold whitespace-nowrap ${profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {fmt(profit)}
                    </td>
                    <td className={`px-4 py-3 text-xs font-num whitespace-nowrap ${margin >= 20 ? 'text-emerald-600' : margin >= 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                      {payout > 0 ? `${margin.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing {(page-1)*50+1}–{Math.min(page*50, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40">
                <ChevronLeft size={13}/>
              </button>
              <span className="text-xs text-slate-600 px-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40">
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <OrderModal
          order={selected === 'new' ? null : selected}
          onClose={() => setSelected(null)}
          onSave={load}
        />
      )}
    </Shell>
  )
}
