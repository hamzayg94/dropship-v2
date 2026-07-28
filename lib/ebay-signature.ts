import crypto from 'crypto'
import { getDb } from './db'

interface SigningKey {
  signing_key_id: string
  jwe: string
  public_key: string
  private_key: string
  cipher: string
  created_at: string
}

function getKeyMgmtBase(): string {
  const e = process.env.EBAY_ENVIRONMENT || 'sandbox'
  return e === 'production' ? 'https://apiz.ebay.com' : 'https://apiz.sandbox.ebay.com'
}

async function generateEbayKey(): Promise<SigningKey> {
  const { getBearerToken } = await import('./ebay')
  const bearer = await getBearerToken()

  const res = await fetch(`${getKeyMgmtBase()}/developer/key_management/v1/signing_key`, {
    method: 'POST',
    headers: {
      Authorization:    `Bearer ${bearer}`,
      'Content-Type':   'application/json',
      'Accept':         'application/json',
      'Accept-Language':'en-GB',
      'Content-Language':'en-GB',
    },
    body: JSON.stringify({ signingKeyCipher: 'ED25519' }),
  })

  if (!res.ok) throw new Error(`Key Management API ${res.status}: ${await res.text()}`)
  const data = await res.json() as Record<string, string>
  if (!data.signingKeyId) throw new Error('eBay did not return signingKeyId: ' + JSON.stringify(data))

  const db = getDb()
  db.prepare("DELETE FROM signing_keys WHERE signing_key_id LIKE 'local-%'").run()
  db.prepare(`
    INSERT OR REPLACE INTO signing_keys (signing_key_id, jwe, public_key, private_key, cipher, created_at)
    VALUES (?, ?, ?, ?, 'ED25519', datetime('now'))
  `).run(data.signingKeyId, data.jwe || '', data.publicKey || '', data.privateKey || '')

  return db.prepare('SELECT * FROM signing_keys WHERE signing_key_id = ?').get(data.signingKeyId) as unknown as SigningKey
}

function getLocalKey(): SigningKey | null {
  const db = getDb()
  return db.prepare('SELECT * FROM signing_keys ORDER BY created_at DESC LIMIT 1').get() as unknown as SigningKey | null
}

async function ensureKey(): Promise<SigningKey> {
  return getLocalKey() || await generateEbayKey()
}

export { ensureKey as getOrCreateSigningKey }
export async function createSigningKey() { return generateEbayKey() }

function buildContentDigest(body: string): string {
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('base64')
  return `sha-256=:${hash}:`
}

export async function buildSignedHeaders(
  method: string,
  fullUrl: string,
  body: string,
): Promise<Record<string, string>> {
  const key     = await ensureKey()
  const url     = new URL(fullUrl)
  const jwkStr  = key.jwe
  const created = Math.floor(Date.now() / 1000)
  const hasBody = typeof body === 'string' && body.length > 0

  const signingLines: string[] = []
  const paramsList:   string[] = []

  if (hasBody) {
    const digest = buildContentDigest(body)
    signingLines.push(`"content-digest": ${digest}`)
    paramsList.push('content-digest')
  }
  paramsList.push('x-ebay-signature-key', '@method', '@path', '@authority')

  signingLines.push(
    `"x-ebay-signature-key": ${jwkStr}`,
    `"@method": ${method.toUpperCase()}`,
    `"@path": ${url.pathname}`,
    `"@authority": ${url.host}`,
  )

  const paramsStr      = paramsList.map(p => `"${p}"`).join(' ')
  const sigParamsValue = `(${paramsStr});created=${created}`
  signingLines.push(`"@signature-params": ${sigParamsValue}`)

  const signingString  = signingLines.join('\n')
  const privateKeyDer  = Buffer.from(key.private_key, 'base64')
  const privateKeyObj  = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' })
  const sigBuffer      = crypto.sign(null, Buffer.from(signingString, 'utf8'), privateKeyObj)

  const headers: Record<string, string> = {
    'x-ebay-enforce-signature': 'true',
    'x-ebay-signature-key':     jwkStr,
    'Signature-Input':          `sig1=${sigParamsValue}`,
    'Signature':                `sig1=:${sigBuffer.toString('base64')}:`,
  }
  if (hasBody) headers['Content-Digest'] = buildContentDigest(body)

  return headers
}
