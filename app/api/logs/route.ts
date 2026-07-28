import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getRoleForUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const username = req.headers.get('x-username')
  if (getRoleForUser(username || '') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const page   = Number(req.nextUrl.searchParams.get('page') || 1)
    const limit  = 50
    const offset = (page - 1) * limit
    const db     = getDb()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db2    = db as any
    const total  = (db2.prepare('SELECT COUNT(*) as c FROM logs').get() as { c: number }).c
    const rows   = db2.prepare(`
      SELECT * FROM logs ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset)

    return NextResponse.json({ logs: rows, total, page, limit })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
