import { NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'
import { withEffective, byMonth, byProduct, byCountry } from '@/lib/calculations'

export async function GET() {
  try {
    const db     = getDb()
    const rows   = db.prepare('SELECT * FROM orders ORDER BY date').all() as unknown as OrderRow[]
    const orders = withEffective(rows)

    const months   = byMonth(orders)
    const products = byProduct(orders)
    const countries = byCountry(orders)

    // Weekly velocity — orders per week for last 12 weeks
    const weeks: Record<string, { week: string; orders: number; revenue: number; profit: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i * 7)
      const startOfWeek = new Date(d)
      startOfWeek.setDate(d.getDate() - d.getDay())
      const key = startOfWeek.toISOString().split('T')[0]
      if (!weeks[key]) {
        weeks[key] = {
          week: startOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          orders: 0, revenue: 0, profit: 0,
        }
      }
    }
    for (const o of orders) {
      const d = new Date(o.date || '')
      const startOfWeek = new Date(d)
      startOfWeek.setDate(d.getDate() - d.getDay())
      const key = startOfWeek.toISOString().split('T')[0]
      if (weeks[key]) {
        weeks[key].orders++
        weeks[key].revenue += o.effectiveRevenue
        weeks[key].profit  += o.effectiveProfit
      }
    }
    const weekly = Object.values(weeks)

    // Margin distribution histogram
    const brackets = [
      { label: 'Loss (<0%)',     min: -Infinity, max: 0,  count: 0 },
      { label: '0–10%',         min: 0,          max: 10, count: 0 },
      { label: '10–20%',        min: 10,         max: 20, count: 0 },
      { label: '20–30%',        min: 20,         max: 30, count: 0 },
      { label: '30–50%',        min: 30,         max: 50, count: 0 },
      { label: '50%+',          min: 50,         max: Infinity, count: 0 },
    ]
    for (const o of orders) {
      if (o.effectivePayout > 0) {
        const m = o.effectiveMargin
        for (const b of brackets) {
          if (m >= b.min && m < b.max) { b.count++; break }
        }
      }
    }

    // Month-over-month comparison
    const lastIdx = months.length - 1
    const mom = lastIdx >= 1 ? {
      revenue: months[lastIdx].revenue - months[lastIdx - 1].revenue,
      profit:  months[lastIdx].profit  - months[lastIdx - 1].profit,
      orders:  months[lastIdx].orders  - months[lastIdx - 1].orders,
      margin:  months[lastIdx].margin  - months[lastIdx - 1].margin,
    } : null

    // Refund rate by product (top 10 by refund count)
    const refundByProduct = products
      .filter(p => p.refunds > 0)
      .map(p => ({ product: p.product.slice(0, 50), refunds: p.refunds, orders: p.orders, rate: p.refunds / p.orders * 100 }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10)

    return NextResponse.json({
      months,
      weekly,
      products: products.slice(0, 20),
      countries: countries.slice(0, 10),
      marginBrackets: brackets,
      mom,
      refundByProduct,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
