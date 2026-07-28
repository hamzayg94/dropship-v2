'use client'

import { useEffect, useState } from 'react'
import Shell from '@/components/layout/shell'
import { fmt, fmtNum, fmtPct, marginColor } from '@/lib/utils'
import type { LiveSummary } from '@/lib/calculations'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingBag, AlertTriangle,
  Package, Globe, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  summary: LiveSummary
  thisMonth: LiveSummary
  lastMonth: LiveSummary
  monthly:  Array<{ label: string; revenue: number; profit: number; orders: number; margin: number }>
  daily:    Array<{ date: string; label: string; orders: number; profit: number; revenue: number }>
  actions:  { missingCost: number; pendingShip: number; refundAlerts: number; missingCountry: number }
  topProducts:  Array<{ product: string; orders: number; profit: number; revenue: number }>
  topCountries: Array<{ country: string; orders: number; profit: number }>
}

function KpiCard({ label, value, sub, trend, trendValue, color = 'text-slate-900' }: {
  label: string; value: string; sub?: string; trend?: 'up'|'down'|'neutral'; trendValue?: string; color?: string
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold font-num ${color}`}>{value}</p>
      {(sub || trendValue) && (
        <div className="flex items-center gap-2 mt-1.5">
          {trendValue && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
              {trend === 'up' ? <TrendingUp size={11}/> : trend === 'down' ? <TrendingDown size={11}/> : null}
              {trendValue}
            </span>
          )}
          {sub && <span className="text-xs text-slate-400">{sub}</span>}
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{color:string;name:string;value:number}>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'Orders' ? fmtNum(p.value) : fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    )
  }

  if (!data) {
    return <Shell><p className="text-rose-500">Failed to load dashboard data.</p></Shell>
  }

  const { summary, thisMonth, lastMonth, monthly, daily, actions, topProducts, topCountries } = data

  const profitTrend = lastMonth.totalProfit > 0
    ? ((thisMonth.totalProfit - lastMonth.totalProfit) / lastMonth.totalProfit) * 100
    : 0

  const totalActions = actions.missingCost + actions.pendingShip + actions.refundAlerts + actions.missingCountry

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">All-time performance overview</p>
        </div>
        <div className="text-xs text-slate-400 font-num">
          {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="This Month Profit"
          value={fmt(thisMonth.totalProfit)}
          trendValue={profitTrend !== 0 ? `${profitTrend > 0 ? '+' : ''}${profitTrend.toFixed(1)}% vs last month` : undefined}
          trend={profitTrend > 0 ? 'up' : profitTrend < 0 ? 'down' : 'neutral'}
          color={thisMonth.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}
        />
        <KpiCard
          label="All-Time Revenue"
          value={fmt(summary.totalRevenue)}
          sub={`${fmtNum(summary.orderCount)} orders`}
        />
        <KpiCard
          label="All-Time Profit"
          value={fmt(summary.totalProfit)}
          sub={`After £${fmt(summary.totalCost).slice(1)} costs`}
          color={summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}
        />
        <KpiCard
          label="Avg Margin"
          value={fmtPct(summary.avgMargin)}
          sub="Target: 20%"
          color={marginColor(summary.avgMargin)}
        />
        <KpiCard
          label="Refunds"
          value={fmtNum(summary.refundCount)}
          sub={`${summary.orderCount > 0 ? ((summary.refundCount / summary.orderCount) * 100).toFixed(1) : 0}% rate`}
        />
      </div>

      {/* Row 2: Daily Chart + Action Queue */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Daily chart */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Last 30 Days</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-indigo-500 inline-block"/><span className="text-slate-500">Revenue</span></span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-emerald-500 inline-block"/><span className="text-slate-500">Profit</span></span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                interval={Math.ceil(daily.length / 8)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                tickFormatter={v => '£'+v} width={45}/>
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[2,2,0,0]} opacity={0.6}/>
              <Bar dataKey="profit"  name="Profit"  fill="#10b981" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action queue */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Action Queue</p>
            {totalActions > 0 && (
              <span className="badge bg-rose-50 text-rose-600">{totalActions} items</span>
            )}
          </div>
          {totalActions === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <span className="text-2xl mb-2">✓</span>
              <p className="text-sm">All clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.missingCost > 0 && (
                <Link href="/costs" className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-amber-600"/>
                    <span className="text-xs font-medium text-amber-800">{actions.missingCost} orders missing cost</span>
                  </div>
                  <ArrowRight size={13} className="text-amber-500"/>
                </Link>
              )}
              {actions.pendingShip > 0 && (
                <Link href="/orders?status=In+Progress" className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={15} className="text-blue-600"/>
                    <span className="text-xs font-medium text-blue-800">{actions.pendingShip} orders to ship</span>
                  </div>
                  <ArrowRight size={13} className="text-blue-500"/>
                </Link>
              )}
              {actions.refundAlerts > 0 && (
                <Link href="/orders?status=Refunded+-+Awaiting+Supplier+Refund" className="flex items-center justify-between p-3 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-rose-600"/>
                    <span className="text-xs font-medium text-rose-800">{actions.refundAlerts} awaiting supplier refund</span>
                  </div>
                  <ArrowRight size={13} className="text-rose-500"/>
                </Link>
              )}
              {actions.missingCountry > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Globe size={15} className="text-slate-500"/>
                    <span className="text-xs font-medium text-slate-600">{actions.missingCountry} orders missing country</span>
                  </div>
                  <span className="text-xs text-slate-400">Sync eBay</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monthly P&L trend */}
      <div className="card p-5 mb-4">
        <p className="text-sm font-semibold text-slate-800 mb-4">Monthly P&L (Last 12 Months)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
              tickFormatter={v => '£'+v} width={50}/>
            <Tooltip content={<CustomTooltip />}/>
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}/>
            <Line dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }}/>
            <Line dataKey="profit"  name="Profit"  stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row: Top Products + Top Countries */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Top Products</p>
            <Link href="/pnl" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="text-xs font-num text-slate-400 w-4 flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{p.product}</p>
                  <p className="text-xs text-slate-400">{p.orders} orders</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-num font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {fmt(p.profit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Top Countries</p>
            <Link href="/analytics" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {topCountries.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="text-xs font-num text-slate-400 w-4 flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{c.country}</p>
                  <p className="text-xs text-slate-400">{c.orders} orders</p>
                </div>
                <p className={`text-xs font-num font-semibold flex-shrink-0 ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {fmt(c.profit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
