'use client'

import { useEffect, useState } from 'react'
import Shell from '@/components/layout/shell'
import { fmt, fmtPct, cn } from '@/lib/utils'
import type { MonthBucket, ProductBucket, CountryBucket } from '@/lib/calculations'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'

interface AnalyticsData {
  months: MonthBucket[]
  weekly: Array<{ week: string; orders: number; revenue: number; profit: number }>
  products: ProductBucket[]
  countries: CountryBucket[]
  marginBrackets: Array<{ label: string; count: number }>
  mom: { revenue: number; profit: number; orders: number; margin: number } | null
  refundByProduct: Array<{ product: string; refunds: number; orders: number; rate: number }>
}

const TT = ({ active, payload, label }: { active?: boolean; payload?: Array<{color:string;name:string;value:number}>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}}>{p.name}: {typeof p.value === 'number' && p.name.includes('Orders') ? p.value : fmt(p.value)}</p>)}
    </div>
  )
}

function MomCard({ label, value, isPositiveGood = true }: { label: string; value: number; unit?: string; isPositiveGood?: boolean }) {
  const up = value > 0
  const color = (isPositiveGood ? up : !up) ? 'text-emerald-600' : 'text-rose-500'
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold font-num ${color}`}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
      </p>
      <p className="text-[10px] text-slate-400 mt-0.5">vs last month</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <Shell><div className="flex h-64 items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div></Shell>
  if (!data)   return <Shell><p className="text-rose-500">Failed to load.</p></Shell>

  const { months, weekly, products, countries, marginBrackets, mom, refundByProduct } = data

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Trends, velocity, margin distribution and risk</p>
      </div>

      {/* Month-over-month */}
      {mom && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Month-Over-Month Change</p>
          <div className="grid grid-cols-4 gap-3">
            <MomCard label="Revenue"  value={months.length >= 2 ? ((months[months.length-1].revenue - months[months.length-2].revenue) / Math.max(1, months[months.length-2].revenue)) * 100 : 0}/>
            <MomCard label="Profit"   value={months.length >= 2 ? ((months[months.length-1].profit  - months[months.length-2].profit)  / Math.max(1, Math.abs(months[months.length-2].profit))) * 100 : 0}/>
            <MomCard label="Orders"   value={months.length >= 2 ? ((months[months.length-1].orders  - months[months.length-2].orders)  / Math.max(1, months[months.length-2].orders))  * 100 : 0}/>
            <MomCard label="Margin"   value={mom.margin} isPositiveGood/>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Weekly velocity */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Weekly Order Velocity</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={2}/>
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={25}/>
              <Tooltip content={<TT />}/>
              <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Margin distribution */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Margin Distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={marginBrackets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={25}/>
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return <div className="card px-3 py-2 text-xs shadow-lg"><p className="font-medium">{label}</p><p>{payload[0].value} orders</p></div>
              }}/>
              <Bar dataKey="count" name="Orders" radius={[3,3,0,0]}>
                {marginBrackets.map((b, i) => (
                  <Cell key={i} fill={
                    b.label.startsWith('Loss') ? '#f43f5e' :
                    b.label.startsWith('0')    ? '#f59e0b' :
                    b.label.startsWith('10')   ? '#f59e0b' :
                    '#10b981'
                  }/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Margin trend line */}
      <div className="card p-5 mb-4">
        <p className="text-sm font-semibold text-slate-800 mb-4">Margin Trend (Monthly)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={months}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v=>v+'%'} width={35}/>
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return <div className="card px-3 py-2 text-xs shadow-lg"><p className="font-medium">{label}</p><p className="text-indigo-600">Margin: {(payload[0].value as number).toFixed(1)}%</p></div>
            }}/>
            <Line dataKey="margin" name="Margin %" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }}
              activeDot={{ r: 6 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Country breakdown */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Country Performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                {['Country','Orders','Payout','Profit','Margin'].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {countries.map(c => (
                  <tr key={c.country} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-800 whitespace-nowrap">{c.country}</td>
                    <td className="px-4 py-2.5 text-xs font-num text-slate-600">{c.orders}</td>
                    <td className="px-4 py-2.5 text-xs font-num text-slate-700">{fmt(c.payout)}</td>
                    <td className={`px-4 py-2.5 text-xs font-num font-semibold ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(c.profit)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('badge', c.margin >= 20 ? 'bg-emerald-50 text-emerald-700' : c.margin >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600')}>
                        {c.payout > 0 ? fmtPct(c.margin) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refund risk */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Refund Risk by Product</p>
          </div>
          {refundByProduct.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No refunds recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Product','Refunds','Orders','Rate'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {refundByProduct.map(p => (
                    <tr key={p.product} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-800 max-w-[200px] truncate">{p.product}</td>
                      <td className="px-4 py-2.5 text-xs font-num text-rose-500">{p.refunds}</td>
                      <td className="px-4 py-2.5 text-xs font-num text-slate-600">{p.orders}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('badge', p.rate >= 20 ? 'bg-rose-50 text-rose-600' : p.rate >= 10 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                          {p.rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
