import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function getBase() {
  return process.env.EBAY_ENVIRONMENT === 'production'
    ? 'https://api.ebay.com'
    : 'https://api.sandbox.ebay.com'
}

function getAuthHeader() {
  return 'Basic ' + Buffer.from(`${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`).toString('base64')
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No auth code' }, { status: 400 })

  try {
    const body = new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: process.env.EBAY_RU_NAME || '',
    })

    const res  = await fetch(`${getBase()}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json() as Record<string, unknown>
    if (!data.access_token) throw new Error('No access token: ' + JSON.stringify(data))

    const expiresAt = Math.floor(Date.now() / 1000) + Number(data.expires_in)
    const db = getDb()
    db.prepare(`
      INSERT OR REPLACE INTO tokens (id, access_token, refresh_token, expires_at, scope, updated_at)
      VALUES (1, ?, ?, ?, ?, datetime('now'))
    `).run(data.access_token as string, data.refresh_token as string, expiresAt, (data.scope as string) || '')

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3100'}/settings?connected=1`)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
