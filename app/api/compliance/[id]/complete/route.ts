import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    // Verify all subtasks are done
    const total = (db.prepare(
      `SELECT COUNT(*) as c FROM compliance_subtasks WHERE obligation_id = ?`
    ).get(id) as { c: number }).c

    const done = (db.prepare(
      `SELECT COUNT(*) as c FROM compliance_subtasks WHERE obligation_id = ? AND done = 1`
    ).get(id) as { c: number }).c

    if (total > 0 && done < total) {
      return NextResponse.json(
        { error: `Complete all ${total} steps before marking done (${done}/${total} done)` },
        { status: 400 }
      )
    }

    db.prepare(`
      UPDATE compliance_obligations
      SET completed = 1, completed_at = datetime('now')
      WHERE id = ?
    `).run(id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
