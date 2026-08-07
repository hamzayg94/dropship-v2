import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { OBLIGATIONS } from '@/lib/compliance-seed'

interface ObRow {
  id: string; title: string; description: string; category: string
  frequency: string; period: string; due_date: string; submit_to: string
  submit_url: string; sort_order: number; completed: number; completed_at: string | null
  notes: string; created_at: string
}
interface StRow {
  id: number; obligation_id: string; step_order: number
  label: string; detail: string; done: number; done_at: string | null
}

function lastDayOfCurrentMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function seedIfNeeded(db: ReturnType<typeof getDb>) {
  const existing = (db.prepare('SELECT COUNT(*) as c FROM compliance_obligations').get() as { c: number }).c
  if (existing > 0) return

  const insertOb = db.prepare(`
    INSERT OR IGNORE INTO compliance_obligations
      (id, title, description, category, frequency, period, due_date, submit_to, submit_url, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `)
  const insertSt = db.prepare(`
    INSERT OR IGNORE INTO compliance_subtasks (obligation_id, step_order, label, detail)
    VALUES (?,?,?,?)
  `)

  db.exec('BEGIN')
  try {
    for (const ob of OBLIGATIONS) {
      const dueDate = ob.frequency === 'monthly' ? lastDayOfCurrentMonth() : ob.due_date
      insertOb.run(ob.id, ob.title, ob.description, ob.category, ob.frequency,
        ob.period, dueDate, ob.submit_to, ob.submit_url, ob.sort_order)
      ob.subtasks.forEach((st, i) => insertSt.run(ob.id, i + 1, st.label, st.detail))
    }
    db.exec('COMMIT')
  } catch (e) { db.exec('ROLLBACK'); throw e }
}

function resetMonthlyIfNeeded(db: ReturnType<typeof getDb>) {
  const cur = currentMonth()
  const monthlies = db.prepare(
    `SELECT id, completed_at FROM compliance_obligations WHERE frequency = 'monthly'`
  ).all() as { id: string; completed_at: string | null }[]

  for (const ob of monthlies) {
    const lastCompletedMonth = ob.completed_at ? ob.completed_at.slice(0, 7) : null
    if (lastCompletedMonth !== cur) {
      // New month — reset obligation and all its subtasks
      db.prepare(`
        UPDATE compliance_obligations
        SET completed = 0, completed_at = NULL, due_date = ?
        WHERE id = ?
      `).run(lastDayOfCurrentMonth(), ob.id)
      db.prepare(`
        UPDATE compliance_subtasks SET done = 0, done_at = NULL WHERE obligation_id = ?
      `).run(ob.id)
    }
  }
}

export async function GET() {
  try {
    const db = getDb()
    seedIfNeeded(db)
    resetMonthlyIfNeeded(db)

    const obs = db.prepare(
      `SELECT * FROM compliance_obligations ORDER BY sort_order ASC, due_date ASC`
    ).all() as unknown as ObRow[]

    const subtasks = db.prepare(
      `SELECT * FROM compliance_subtasks ORDER BY obligation_id, step_order ASC`
    ).all() as unknown as StRow[]

    const stMap: Record<string, StRow[]> = {}
    for (const st of subtasks) {
      if (!stMap[st.obligation_id]) stMap[st.obligation_id] = []
      stMap[st.obligation_id].push(st)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = obs.map(ob => {
      const subs = stMap[ob.id] || []
      const doneSubs = subs.filter(s => s.done === 1).length
      const due = new Date(ob.due_date)
      const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000)
      let urgency: 'done' | 'overdue' | 'urgent' | 'soon' | 'ok'
      if (ob.completed === 1) urgency = 'done'
      else if (daysUntil < 0) urgency = 'overdue'
      else if (daysUntil <= 7) urgency = 'urgent'
      else if (daysUntil <= 30) urgency = 'soon'
      else urgency = 'ok'

      return {
        ...ob,
        completed: ob.completed === 1,
        subtasks: subs.map(s => ({ ...s, done: s.done === 1 })),
        progress: { done: doneSubs, total: subs.length },
        daysUntil,
        urgency,
      }
    })

    // Warning counts for sidebar badge
    const alerts = result.filter(o => o.urgency === 'overdue' || o.urgency === 'urgent').length

    return NextResponse.json({ obligations: result, alerts })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
