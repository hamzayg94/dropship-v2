import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const key = getDb().prepare(
      'SELECT signing_key_id, cipher, created_at FROM signing_keys ORDER BY created_at DESC LIMIT 1'
    ).get() as Record<string, string> | null
    return NextResponse.json({ hasKey: !!key, key: key || null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
