import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { logActivity } from '@/lib/logger'

interface CostRow { order_id: string; cost: number; supplier?: string; supplier_order_id?: string }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CostRow[]
    if (!Array.isArray(body) || body.length === 0)
      return NextResponse.json({ error: 'Expected array of {order_id, cost}' }, { status: 400 })

    const db = getDb()
    const update = db.prepare(`
      UPDATE orders SET
        cost              = ?,
        supplier          = CASE WHEN ? != '' AND (supplier          IS NULL OR supplier          = '') THEN ? ELSE supplier          END,
        supplier_order_id = CASE WHEN ? != '' AND (supplier_order_id IS NULL OR supplier_order_id = '') THEN ? ELSE supplier_order_id END,
        profit            = payout - ad_fee - ?,
        margin            = CASE WHEN payout > 0 THEN (payout - ad_fee - ?) / payout * 100 ELSE 0 END,
        updated_at        = datetime('now')
      WHERE id = ? AND (cost IS NULL OR cost = 0)
        AND status IN ('Dispatched', 'In Progress', 'Label Created')
    `)

    let updated = 0
    db.exec('BEGIN')
    try {
      for (const row of body) {
        const cost    = Number(row.cost || 0)
        const sup     = (row.supplier          || '').trim()
        const sid     = (row.supplier_order_id || '').trim()
        if (!row.order_id || cost <= 0) continue
        const result = update.run(cost, sup, sup, sid, sid, cost, cost, row.order_id) as { changes: number }
        updated += result.changes
      }
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }

    const user = request.headers.get('x-username') || 'unknown'
    logActivity({ user, action: 'cost_imported', entityType: 'import', detail: `${updated} orders updated from ${body.length} CSV rows` })
    return NextResponse.json({ ok: true, updated, total: body.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
