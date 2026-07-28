const COOKIE  = 'ds_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

function secret() {
  return process.env.SESSION_SECRET || 'change-me-in-production'
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function sign(username: string, ts: number): Promise<string> {
  const key = await getKey()
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${username}:${ts}`))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function makeToken(username: string): Promise<string> {
  const ts  = Date.now()
  const sig = await sign(username, ts)
  return `${username}:${ts}:${sig}`
}

export async function verifyToken(token: string): Promise<string | null> {
  const parts = token.split(':')
  if (parts.length < 3) return null
  const sig      = parts.pop()!
  const ts       = Number(parts.pop())
  const username = parts.join(':')
  if (!username || isNaN(ts)) return null
  if (Date.now() - ts > MAX_AGE * 1000) return null
  const expected = await sign(username, ts)
  if (sig.length !== expected.length) return null
  // Constant-time compare
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0 ? username : null
}

export async function getSession(): Promise<string | null> {
  const { cookies } = await import('next/headers')
  const jar   = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : ''
  return `${COOKIE}=${token}; HttpOnly;${secure} Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
}

export function clearCookieHeader(): string {
  return `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export function getAccounts() {
  return [
    { username: process.env.ADMIN_USERNAME   || 'admin',   password: process.env.ADMIN_PASSWORD   || '', role: 'admin'   },
    { username: process.env.PARTNER_USERNAME || 'partner', password: process.env.PARTNER_PASSWORD || '', role: 'partner' },
  ]
}

export function checkCredentials(username: string, password: string) {
  return getAccounts().find(a => a.username === username && a.password === password) || null
}

export function getRoleForUser(username: string): string | null {
  return getAccounts().find(a => a.username === username)?.role ?? null
}
