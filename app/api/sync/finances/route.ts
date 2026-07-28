import { NextRequest, NextResponse } from 'next/server'
import { runFinanceSync } from '@/lib/sync-tasks'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { days?: number }
    const user = request.headers.get('x-username') || 'auto'
    const result = await runFinanceSync(user, { days: body.days })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
