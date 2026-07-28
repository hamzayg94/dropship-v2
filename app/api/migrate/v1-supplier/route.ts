import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { DatabaseSync } from 'node:sqlite'
import path from 'path'

const V1_DB = path.resolve('C:/Users/hamza/dropship-agent/backend/db/dropship.db')

export async function POST() {
  try {
    const v1  = new DatabaseSync(V1_DB)
    const db  = getDb()

    const v1rows = v1.prepare(`
      SELECT id, supplier_link, supplier_order_id
      FROM orders
      WHERE supplier_link != '' OR supplier_order_id != ''
    `).all() as { id: string; supplier_link: string; supplier_order_id: string }[]

    v1.close()

    const update = db.prepare(`
      UPDATE orders SET
        supplier_link     = CASE WHEN ? != '' AND (supplier_link     IS NULL OR supplier_link     = '') THEN ? ELSE supplier_link     END,
        supplier_order_id = CASE WHEN ? != '' AND (supplier_order_id IS NULL OR supplier_order_id = '') THEN ? ELSE supplier_order_id END,
        updated_at        = datetime('now')
      WHERE id = ?
    `)

    let updated = 0
    db.exec('BEGIN')
    try {
      for (const r of v1rows) {
        const link = r.supplier_link     || ''
        const sid  = r.supplier_order_id || ''
        const res  = update.run(link, link, sid, sid, r.id) as { changes: number }
        updated   += res.changes
      }
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }

    return NextResponse.json({ ok: true, matched: updated, total: v1rows.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
