'use client'

import { useEffect, useState } from 'react'
import Shell from '@/components/layout/shell'
import { fmt, fmtPct, cn } from '@/lib/utils'
import type { LiveSummary, MonthBucket, ProductBucket, CountryBucket } from '@/lib/calculations'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine, Legend,
} from 'recharts'

interface WaterfallItem { label: string; value: number; note: string; sign: string }
interface PnlData {
  summary:   LiveSummary
  waterfall: WaterfallItem[]
  months:    MonthBucket[]
  products:  ProductBucket[]
  countries: CountryBucket[]
  suppliers: Array<{ supplier: string; orders: number; cost: number; profit: number }>
  netProfit: number
  totals:    { subscription: number; postage: number; other: number; total: number }
}

type Tab = 'monthly' | 'products' | 'countries' | 'suppliers'

const TOOLTIP = ({ active, payload, label }: { active?: boolean; payload?: Array<{color:string;name:string;value:number}>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  )
}

export default function PnlPage() {
  const [data, setData] = useState<PnlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('monthly')

  useEffect(() => {
    fetch('/api/pnl').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <Shell><div className="flex h-64 items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div></Shell>
  if (!data)   return <Shell><p className="text-rose-500">Failed to load P&L data.</p></Shell>

  const { summary, waterfall, months, products, countries, suppliers } = data

  const donutData = [
    { name: 'Supplier Costs', value: summary.totalCost,               color: '#6366f1' },
    { name: 'Ad Fees',        value: summary.totalAdFees,             color: '#f43f5e' },
    { name: 'Overheads',      value: data.totals.total,               color: '#f59e0b' },
    { name: 'Net Profit',     value: Math.max(0, data.netProfit),     color: '#10b981' },
  ].filter(d => d.value > 0)

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">P&L Statement</h1>
        <p className="text-sm text-slate-500">All-time profit & loss, clean arithmetic basis</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Waterfall */}
        <div className="card p-5 col-span-1">
          <p className="text-sm font-semibold text-slate-800 mb-4">Income Statement</p>
          <div className="space-y-1">
            {waterfall.map((item, i) => {
              const isEquals = item.sign === '='
              const isMinus  = item.sign === '−'
              return (
                <div key={i} className={cn('py-2', isEquals ? 'border-t border-slate-200 mt-1' : '')}>
                  <div className={cn('flex items-center justify-between gap-2', isEquals ? 'font-semibold' : '')}>
                    <div className="flex items-center gap-2 min-w-0">
                      {item.sign && (
                        <span className={cn('text-xs font-mono w-3 flex-shrink-0',
                          isEquals ? 'text-slate-400' : isMinus ? 'text-rose-400' : 'text-slate-400')}>
                          {item.sign}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-400">{item.note}</p>
                      </div>
                    </div>
                    <span className={cn('text-xs font-num flex-shrink-0',
                      isEquals ? 'text-slate-900 text-sm' :
                      isMinus  ? 'text-rose-500' : 'text-slate-700')}>
                      {item.sign === '−' ? `-${fmt(Math.abs(item.value))}` : fmt(item.value)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Avg Order Margin</span>
              <span className={cn('text-sm font-bold font-num', summary.avgMargin >= 20 ? 'text-emerald-600' : summary.avgMargin >= 0 ? 'text-amber-600' : 'text-rose-500')}>
                {fmtPct(summary.avgMargin)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">True Net Profit</span>
              <span className={cn('text-base font-bold font-num', data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                {fmt(data.netProfit)}
              </span>
            </div>
            {summary.missingCostCount > 0 && (
              <p className="text-[10px] text-amber-600">
                ⚠ {summary.missingCostCount} orders missing cost — profit understated
              </p>
            )}
            {data.totals.total === 0 && (
              <p className="text-[10px] text-slate-400">
                Import eBay Expenses CSV on Costs page to include overheads
              </p>
            )}
          </div>
        </div>

        {/* Right panel: 3 charts */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Monthly Revenue vs Profit */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-800 mb-4">Monthly Revenue vs Profit</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={months.slice(-12)} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v=>'£'+v} width={50}/>
                <Tooltip content={<TOOLTIP />}/>
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[3,3,0,0]} opacity={0.7}/>
                <Bar dataKey="profit"  name="Profit"  radius={[3,3,0,0]}>
                  {months.slice(-12).map((m, i) => (
                    <Cell key={i} fill={m.profit >= 0 ? '#10b981' : '#f43f5e'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Row 2: Margin Trend + Cost Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {/* Margin % Trend */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-800 mb-1">Monthly Margin %</p>
              <p className="text-xs text-slate-400 mb-3">Gross profit margin after ad fees & supplier costs</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={months.slice(-12)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`} width={36}/>
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margin']} labelStyle={{ color: '#475569', fontSize: 11 }} contentStyle={{ fontSize: 11 }}/>
                  <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth={1}/>
                  <Line dataKey="margin" name="Margin %" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 4 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cost Breakdown Donut */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-800 mb-1">Payout Breakdown</p>
              <p className="text-xs text-slate-400 mb-3">Where every £1 of payout goes</p>
              {donutData.length === 0 ? (
                <div className="flex h-[160px] items-center justify-center text-xs text-slate-400">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={donutData} cx="40%" cy="50%" innerRadius={42} outerRadius={66} dataKey="value" paddingAngle={2}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Legend
                      layout="vertical" align="right" verticalAlign="middle"
                      iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 10, color: '#64748b' }}>{v}</span>}
                    />
                    <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ fontSize: 11 }}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(['monthly','products','countries','suppliers'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-3 text-sm font-medium capitalize transition-colors',
                tab === t ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-slate-500 hover:text-slate-700')}>
              {t}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {tab === 'monthly' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                {['Month','Orders','Revenue','Payout','Ad Fees','Cost','Gross Profit','Overheads','Net Profit','Margin','Refunds'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...months].reverse().map(m => (
                  <tr key={m.month} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">{m.label}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{m.orders}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(m.revenue)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(m.payout)}</td>
                    <td className="px-4 py-3 text-xs font-num text-rose-400">{m.adFees > 0 ? `-${fmt(m.adFees)}` : '—'}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{fmt(m.cost)}</td>
                    <td className={`px-4 py-3 text-xs font-num font-semibold ${m.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(m.profit)}</td>
                    <td className="px-4 py-3 text-xs font-num text-rose-400">{m.expenses > 0 ? `-${fmt(m.expenses)}` : '—'}</td>
                    <td className={`px-4 py-3 text-xs font-num font-bold ${m.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{fmt(m.netProfit)}</td>
                    <td className={`px-4 py-3 text-xs font-num ${m.margin >= 20 ? 'text-emerald-600' : m.margin >= 0 ? 'text-amber-600' : 'text-rose-500'}`}>{fmtPct(m.margin)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{m.refunds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'products' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                {['Product','Orders','Revenue','Payout','Avg Cost','Profit','Margin','Refunds'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.product} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.product}</p>
                      {!p.hasCost && <p className="text-[10px] text-amber-500">Missing cost data</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{p.orders}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(p.revenue)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(p.payout)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{p.hasCost ? fmt(p.avgCost) : <span className="text-amber-400">—</span>}</td>
                    <td className={`px-4 py-3 text-xs font-num font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(p.profit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', p.margin >= 20 ? 'bg-emerald-50 text-emerald-700' : p.margin >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600')}>
                        {p.payout > 0 ? fmtPct(p.margin) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{p.refunds || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'countries' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                {['Country','Orders','Revenue','Payout','Cost','Profit','Margin','Refunds'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {countries.map(c => (
                  <tr key={c.country} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{c.country}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{c.orders}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(c.revenue)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(c.payout)}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{fmt(c.cost)}</td>
                    <td className={`px-4 py-3 text-xs font-num font-semibold ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(c.profit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', c.margin >= 20 ? 'bg-emerald-50 text-emerald-700' : c.margin >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600')}>
                        {c.payout > 0 ? fmtPct(c.margin) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{c.refunds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'suppliers' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                {['Supplier','Orders','Total Cost','Total Profit'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.supplier} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs font-medium text-slate-800">{s.supplier || 'No Supplier'}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-600">{s.orders}</td>
                    <td className="px-4 py-3 text-xs font-num text-slate-700">{fmt(s.cost)}</td>
                    <td className={`px-4 py-3 text-xs font-num font-semibold ${s.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(s.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  )
}
