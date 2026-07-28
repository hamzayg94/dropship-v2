import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import path from 'path'

// One-time DB migration endpoint — DELETE THIS FILE after migration is done
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { db } = await request.json() as { db: string }
    if (!db) return NextResponse.json({ error: 'No db field in body' }, { status: 400 })

    const dbPath = process.env.DB_PATH
      ? path.resolve(process.cwd(), process.env.DB_PATH)
      : path.join(process.cwd(), 'data', 'dropship.db')

    const buf = Buffer.from(db, 'base64')
    writeFileSync(dbPath, buf)

    return NextResponse.json({ ok: true, bytes: buf.length, path: dbPath })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
