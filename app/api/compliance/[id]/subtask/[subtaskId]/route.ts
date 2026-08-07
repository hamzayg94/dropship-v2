import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { id, subtaskId } = await params
    const { done } = await req.json() as { done: boolean }
    const db = getDb()

    // Verify subtask belongs to this obligation
    const st = db.prepare(
      `SELECT id FROM compliance_subtasks WHERE id = ? AND obligation_id = ?`
    ).get(Number(subtaskId), id)
    if (!st) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    db.prepare(`
      UPDATE compliance_subtasks
      SET done = ?, done_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
      WHERE id = ?
    `).run(done ? 1 : 0, done ? 1 : 0, Number(subtaskId))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
