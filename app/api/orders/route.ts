import { NextRequest, NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const status   = searchParams.get('status')
    const country  = searchParams.get('country')
    const search   = searchParams.get('q')
    const page     = Number(searchParams.get('page') || 1)
    const limit    = Number(searchParams.get('limit') || 50)
    const offset   = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: unknown[] = []

    if (status && status === 'missing_cost') {
      where += " AND (cost IS NULL OR cost = 0) AND status NOT IN ('Refunded', 'Cancelled')"
    } else if (status && status !== 'all') {
      where += ' AND status = ?'
      params.push(status)
    }
    if (country) {
      where += ' AND country = ?'
      params.push(country)
    }
    if (search) {
      where += ' AND (product LIKE ? OR buyer LIKE ? OR id LIKE ?)'
      const q = `%${search}%`
      params.push(q, q, q)
    }

    const db    = getDb()
    // node:sqlite does not accept spread for params — pass as array via bind
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db2   = db as any
    const total = (db2.prepare(`SELECT COUNT(*) as c FROM orders ${where}`).get(...params) as { c: number }).c
    const rows  = db2.prepare(`SELECT * FROM orders ${where} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as OrderRow[]

    return NextResponse.json({ orders: rows, total, page, limit })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<OrderRow>
    const db   = getDb()

    const id = body.id || `MANUAL-${Date.now()}`
    db.prepare(`
      INSERT INTO orders
        (id, date, product, buyer, postcode, country, country_code,
         quantity, variation,
         price, payout, cost, fvf, ad_fee, profit, margin,
         status, supplier, supplier_link, tracking,
         dispatch, supplier_order_id, notes, ebay_synced)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)
    `).run(
      id,
      body.date || new Date().toISOString().split('T')[0],
      body.product || '',
      body.buyer   || '',
      body.postcode    || '',
      body.country     || '',
      body.country_code || '',
      Number(body.quantity || 1),
      body.variation || '',
      Number(body.price   || 0),
      Number(body.payout  || 0),
      Number(body.cost    || 0),
      Number(body.fvf     || 0),
      Number(body.ad_fee  || 0),
      Number(body.payout || 0) - Number(body.ad_fee || 0) - Number(body.cost || 0),
      Number(body.payout || 0) > 0
        ? ((Number(body.payout || 0) - Number(body.ad_fee || 0) - Number(body.cost || 0)) / Number(body.payout || 0)) * 100
        : 0,
      body.status  || 'Completed',
      body.supplier || '',
      body.supplier_link || '',
      body.tracking || '',
      body.dispatch || '',
      body.supplier_order_id || '',
      body.notes    || '',
    )

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
