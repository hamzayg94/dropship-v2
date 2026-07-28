import { NextRequest, NextResponse } from 'next/server'
import { clearCookieHeader } from '@/lib/session'
import { logActivity } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const user = req.headers.get('x-username') || 'unknown'
  logActivity({ user, action: 'logout', detail: 'Signed out' })
  return NextResponse.json({ ok: true }, {
    headers: { 'Set-Cookie': clearCookieHeader() },
  })
}
