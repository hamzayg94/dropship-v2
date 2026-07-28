import { NextRequest, NextResponse } from 'next/server'
import { createSigningKey, getOrCreateSigningKey } from '@/lib/ebay-signature'

export async function POST(request: NextRequest) {
  try {
    const body  = await request.json().catch(() => ({})) as { force?: boolean }
    const key   = body.force ? await createSigningKey() : await getOrCreateSigningKey()
    const k = key as unknown as Record<string,string>
    return NextResponse.json({ ok: true, signingKeyId: k.signing_key_id, created: k.created_at })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
