import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { logActivity } from '@/lib/logger'

interface AdFeeRow      { order_id: string; amount: number }
interface ExpenseRow    { month: string; category: string; description: string; amount: number }

interface ImportBody {
  ad_fees:          AdFeeRow[]
  monthly_expenses: ExpenseRow[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ImportBody
    const db   = getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db2  = db as any
    const user = request.headers.get('x-username') || 'unknown'

    // ── Ad fees per order ──────────────────────────────────────────────────
    const updateAdFee = db2.prepare(`
      UPDATE orders SET
        ad_fee     = ?,
        profit     = payout - ? - cost,
        margin     = CASE WHEN payout > 0 THEN (payout - ? - cost) / payout * 100 ELSE 0 END,
        updated_at = datetime('now')
      WHERE id = ?
    `)

    let adFeesUpdated = 0
    db2.exec('BEGIN')
    try {
      for (const row of (body.ad_fees || [])) {
        if (!row.order_id) continue
        const amount = Math.max(0, Number(row.amount) || 0)
        const result = updateAdFee.run(amount, amount, amount, row.order_id) as { changes: number }
        adFeesUpdated += result.changes
      }
      db2.exec('COMMIT')
    } catch (e) { db2.exec('ROLLBACK'); throw e }

    // ── Monthly operating expenses ─────────────────────────────────────────
    const upsertExpense = db2.prepare(`
      INSERT INTO monthly_expenses (month, category, description, amount, source, updated_at)
      VALUES (?, ?, ?, ?, 'csv_import', datetime('now'))
      ON CONFLICT(month, category, description) DO UPDATE SET
        amount     = excluded.amount,
        source     = 'csv_import',
        updated_at = datetime('now')
    `)

    let expensesUpserted = 0
    db2.exec('BEGIN')
    try {
      for (const e of (body.monthly_expenses || [])) {
        if (!e.month || !e.category || e.amount <= 0) continue
        upsertExpense.run(e.month, e.category, e.description, e.amount)
        expensesUpserted++
      }
      db2.exec('COMMIT')
    } catch (e) { db2.exec('ROLLBACK'); throw e }

    logActivity({
      user,
      action:     'expenses_imported',
      entityType: 'import',
      detail:     `Ad fees: ${adFeesUpdated} orders updated | Overheads: ${expensesUpserted} expense lines upserted`,
    })

    return NextResponse.json({ ok: true, adFeesUpdated, expensesUpserted })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
