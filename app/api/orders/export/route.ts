import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db     = getDb()
    const orders = db.prepare(`SELECT * FROM orders ORDER BY date DESC, created_at DESC`).all() as Record<string, unknown>[]

    const headers = [
      'order_id', 'date', 'product', 'buyer', 'country', 'quantity', 'variation',
      'sale_price', 'payout', 'cost', 'fvf', 'ad_fee', 'profit', 'margin',
      'status', 'supplier', 'tracking', 'postcode', 'notes',
    ]

    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const rows = orders.map(o => [
      escape(o.id),
      escape(o.date),
      escape(o.product),
      escape(o.buyer),
      escape(o.country),
      escape(o.quantity ?? 1),
      escape(o.variation),
      escape(o.price),
      escape(o.payout),
      escape(o.cost),
      escape(o.fvf),
      escape(o.ad_fee),
      escape(o.profit),
      escape(typeof o.margin === 'number' ? o.margin.toFixed(1) : o.margin),
      escape(o.status),
      escape(o.supplier),
      escape(o.tracking),
      escape(o.postcode),
      escape(o.notes),
    ].join(','))

    const csv  = [headers.join(','), ...rows].join('\n')
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${date}.csv"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
