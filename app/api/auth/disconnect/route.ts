import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function DELETE() {
  try {
    getDb().prepare('DELETE FROM tokens WHERE id = 1').run()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
