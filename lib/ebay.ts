import { getDb } from './db'

const BASE = {
  production: 'https://api.ebay.com',
  sandbox:    'https://api.sandbox.ebay.com',
}
const APIZ_BASE = {
  production: 'https://apiz.ebay.com',
  sandbox:    'https://apiz.sandbox.ebay.com',
}

function env(): 'production' | 'sandbox' {
  return (process.env.EBAY_ENVIRONMENT || 'sandbox') as 'production' | 'sandbox'
}

function getBase()     { return BASE[env()] }
function getApizBase() { return APIZ_BASE[env()] }

function getAuthHeader(): string {
  const id     = process.env.EBAY_APP_ID
  const secret = process.env.EBAY_CERT_ID
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

function getToken() {
  const db  = getDb()
  return db.prepare('SELECT * FROM tokens WHERE id = 1').get() as Record<string, unknown> | null
}

function isTokenValid(token: Record<string, unknown> | null): boolean {
  if (!token?.access_token) return false
  return Number(token.expires_at) > Math.floor(Date.now() / 1000) + 60
}

async function refreshToken(refreshTok: string): Promise<string> {
  const url  = `${getBase()}/identity/v1/oauth2/token`
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshTok,
    scope: [
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.finances',
    ].join(' '),
  })

  const res  = await fetch(url, {
    method: 'POST',
    headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json() as Record<string, unknown>
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data))

  const expiresAt = Math.floor(Date.now() / 1000) + Number(data.expires_in)
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO tokens (id, access_token, refresh_token, expires_at, scope, updated_at)
    VALUES (1, ?, ?, ?, ?, datetime('now'))
  `).run(data.access_token as string, refreshTok, expiresAt, (data.scope as string) || '')

  return data.access_token as string
}

export async function getBearerToken(): Promise<string> {
  const token = getToken()
  if (isTokenValid(token)) return token!.access_token as string
  if (token?.refresh_token) return refreshToken(token.refresh_token as string)
  throw new Error('eBay not connected. Go to Settings to connect.')
}

const SIGNED_PREFIXES = ['/sell/finances/']

function needsSignature(path: string): boolean {
  return SIGNED_PREFIXES.some(p => path.startsWith(p))
}

export async function ebayFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const bearer = await getBearerToken()
  const base   = needsSignature(path) ? getApizBase() : getBase()
  const url    = `${base}${path}`
  const method = ((options.method || 'GET') as string).toUpperCase()

  const headers: Record<string, string> = {
    Authorization:    `Bearer ${bearer}`,
    'Content-Type':   'application/json',
    'Accept-Language': 'en-GB',
    'Content-Language':'en-GB',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (needsSignature(path)) {
    const { buildSignedHeaders } = await import('./ebay-signature')
    const sigHeaders = await buildSignedHeaders(method, url, (options.body as string) || '')
    Object.assign(headers, sigHeaders)
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`eBay API ${res.status}: ${err}`)
  }
  if (res.status === 204) return {}
  return res.json()
}

export function getTokenInfo() {
  return getToken()
}

export function isConnected(): boolean {
  return isTokenValid(getToken())
}
