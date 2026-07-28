import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { db } = await request.json() as { db: string }
    if (!db) return NextResponse.json({ error: 'No db field' }, { status: 400 })
    const dbPath = process.env.DB_PATH
      ? path.resolve(process.cwd(), process.env.DB_PATH)
      : path.join(process.cwd(), 'data', 'dropship.db')
    writeFileSync(dbPath, Buffer.from(db, 'base64'))
    return NextResponse.json({ ok: true, path: dbPath })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
