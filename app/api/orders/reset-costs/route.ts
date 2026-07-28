import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST() {
  try {
    const db = getDb()
    const result = db.prepare(`
      UPDATE orders
      SET cost       = 0,
          profit     = payout,
          margin     = 0,
          updated_at = datetime('now')
      WHERE status IN ('Dispatched', 'In Progress', 'Label Created')
        AND cost > 0
    `).run() as { changes: number }

    return NextResponse.json({ ok: true, reset: result.changes })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
