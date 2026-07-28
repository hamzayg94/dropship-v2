import { NextRequest, NextResponse } from 'next/server'
import { checkCredentials, makeToken, sessionCookieHeader } from '@/lib/session'
import { logActivity } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username: string; password: string }
  const account = checkCredentials(username?.trim(), password)

  if (!account) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const token = await makeToken(account.username)
  logActivity({ user: account.username, action: 'login', detail: 'Signed in' })
  return NextResponse.json({ ok: true, username: account.username, role: account.role }, {
    headers: { 'Set-Cookie': sessionCookieHeader(token) },
  })
}
