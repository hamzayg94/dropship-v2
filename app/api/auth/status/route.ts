import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db    = getDb()
    const token = db.prepare('SELECT * FROM tokens WHERE id = 1').get() as Record<string, unknown> | null

    if (!token?.access_token) {
      return NextResponse.json({ connected: false, valid: false })
    }

    const now            = Math.floor(Date.now() / 1000)
    const expiresInMins  = Math.round((Number(token.expires_at) - now) / 60)
    const scopes         = ((token.scope as string) || '').split(' ').filter(Boolean)
    const hasFinances    = scopes.length === 0 || scopes.some(s => s.includes('sell.finances'))

    return NextResponse.json({
      connected:       expiresInMins > -60,
      valid:           expiresInMins > 0,
      expiresInMins,
      environment:     process.env.EBAY_ENVIRONMENT || 'sandbox',
      hasFinances,
      scopes,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
