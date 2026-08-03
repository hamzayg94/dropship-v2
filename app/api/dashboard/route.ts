import { NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'
import { withEffective, liveSummary, byMonth } from '@/lib/calculations'

export async function GET() {
  try {
    const db = getDb()

    // All non-cancelled for summary
    const allOrders = db.prepare(
      `SELECT * FROM orders ORDER BY date DESC`
    ).all() as unknown as OrderRow[]

    const effective = withEffective(allOrders)
    const summary   = liveSummary(effective)
    const monthly   = byMonth(effective)

    // Overheads from monthly_expenses (same source as P&L)
    const expenseRows = db.prepare('SELECT month, amount FROM monthly_expenses').all() as { month: string; amount: number }[]
    const expenseByMonth: Record<string, number> = {}
    for (const e of expenseRows) {
      expenseByMonth[e.month] = (expenseByMonth[e.month] || 0) + Number(e.amount || 0)
    }
    const totalExpenses = Object.values(expenseByMonth).reduce((s, v) => s + v, 0)
    summary.totalProfit        -= totalExpenses
    thisMonthSum.totalProfit   -= (expenseByMonth[thisMonth] || 0)
    lastMonthSum.totalProfit   -= (expenseByMonth[lastMonth] || 0)

    // This month
    const thisMonth  = new Date().toISOString().slice(0, 7)
    const lastMonth  = (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7)
    })()

    const thisMonthOrders = effective.filter(o => (o.date || '').startsWith(thisMonth))
    const lastMonthOrders = effective.filter(o => (o.date || '').startsWith(lastMonth))
    const thisMonthSum    = liveSummary(thisMonthOrders)
    const lastMonthSum    = liveSummary(lastMonthOrders)

    // Daily chart — last 30 days
    const days: Record<string, { orders: number; profit: number; revenue: number }> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const k = d.toISOString().split('T')[0]
      days[k] = { orders: 0, profit: 0, revenue: 0 }
    }
    for (const o of effective) {
      const d = (o.date || '').slice(0, 10)
      if (days[d]) {
        days[d].orders++
        days[d].profit  += o.effectiveProfit
        days[d].revenue += o.effectiveRevenue
      }
    }
    const daily = Object.entries(days).map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      ...v,
    }))

    // Action items
    const actions = {
      missingCost:  effective.filter(o => !o.isFullRefund && Number(o.cost || 0) === 0).length,
      pendingShip:  allOrders.filter(o => o.status === 'In Progress' || o.status === 'Label Created').length,
      refundAlerts: allOrders.filter(o => o.status === 'Refunded - Awaiting Supplier Refund').length,
      missingCountry: allOrders.filter(o => !o.country && o.ebay_synced === 1).length,
    }

    // Top products (by profit)
    const prodMap: Record<string, { product: string; orders: number; profit: number; revenue: number }> = {}
    for (const o of effective) {
      const p = o.product || 'Unknown'
      if (!prodMap[p]) prodMap[p] = { product: p, orders: 0, profit: 0, revenue: 0 }
      prodMap[p].orders++
      prodMap[p].profit  += o.effectiveProfit
      prodMap[p].revenue += o.effectiveRevenue
    }
    const topProducts = Object.values(prodMap).sort((a, b) => b.profit - a.profit).slice(0, 5)

    // Top countries
    const countryMap: Record<string, { country: string; orders: number; profit: number }> = {}
    for (const o of effective) {
      const c = o.country || 'Unknown'
      if (!countryMap[c]) countryMap[c] = { country: c, orders: 0, profit: 0 }
      countryMap[c].orders++
      countryMap[c].profit += o.effectiveProfit
    }
    const topCountries = Object.values(countryMap).sort((a, b) => b.orders - a.orders).slice(0, 5)

    return NextResponse.json({
      summary,
      thisMonth: thisMonthSum,
      lastMonth: lastMonthSum,
      monthly:   monthly.slice(-12),
      daily,
      actions,
      topProducts,
      topCountries,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
