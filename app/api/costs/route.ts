import { NextRequest, NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'

// GET /api/costs — returns product groups with missing cost
export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT product,
             COUNT(*) as order_count,
             SUM(CASE WHEN cost > 0 THEN 1 ELSE 0 END) as has_cost_count,
             AVG(price)  as avg_price,
             AVG(payout) as avg_payout,
             AVG(CASE WHEN cost > 0 THEN cost ELSE NULL END) as avg_cost,
             MAX(date) as last_date
      FROM orders
      WHERE status NOT IN ('Refunded', 'Cancelled')
      GROUP BY product
      ORDER BY order_count DESC
    `).all() as Array<{
      product: string
      order_count: number
      has_cost_count: number
      avg_price: number
      avg_payout: number
      avg_cost: number | null
      last_date: string
    }>

    return NextResponse.json({ groups: rows })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/costs — bulk assign cost to all orders matching a product name
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { assignments: Array<{ product: string; cost: number }> }
    const db   = getDb()

    let updated = 0
    for (const { product, cost } of body.assignments) {
      if (!product || Number(cost) <= 0) continue
      const result = db.prepare(`
        UPDATE orders
        SET cost       = ?,
            profit     = payout - ad_fee - ?,
            margin     = CASE WHEN payout > 0 THEN ((payout - ad_fee - ?) / payout) * 100 ELSE 0 END,
            updated_at = datetime('now')
        WHERE product = ? AND (cost IS NULL OR cost = 0)
      `).run(Number(cost), Number(cost), Number(cost), product) as { changes: number }
      updated += result.changes
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
