import { NextResponse } from 'next/server'
import { getSession, getAccounts } from '@/lib/session'

export async function GET() {
  const username = await getSession()
  if (!username) return NextResponse.json({ user: null })
  const account  = getAccounts().find(a => a.username === username)
  return NextResponse.json({ user: { username, role: account?.role || 'partner' } })
}
