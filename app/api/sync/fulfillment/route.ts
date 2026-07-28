import { NextRequest, NextResponse } from 'next/server'
import { runFulfillmentSync } from '@/lib/sync-tasks'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { since?: string; fullSync?: boolean }
    const user = request.headers.get('x-username') || 'auto'
    const result = await runFulfillmentSync(user, { fullSync: body.fullSync, since: body.since })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
