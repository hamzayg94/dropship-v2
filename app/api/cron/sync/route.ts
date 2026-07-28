import { NextRequest, NextResponse } from 'next/server'
import { runFulfillmentSync, runFinanceSync } from '@/lib/sync-tasks'
import { logActivity } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // Verify cron secret
  const auth   = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const started = Date.now()

  try {
    const [ebay, finance] = await Promise.allSettled([
      runFulfillmentSync('auto'),
      runFinanceSync('auto'),
    ])

    const ebayResult    = ebay.status    === 'fulfilled' ? ebay.value    : null
    const financeResult = finance.status === 'fulfilled' ? finance.value : null
    const ebayErr       = ebay.status    === 'rejected'  ? String(ebay.reason)    : null
    const financeErr    = finance.status === 'rejected'  ? String(finance.reason) : null

    const durationSecs = ((Date.now() - started) / 1000).toFixed(1)

    logActivity({
      user:   'auto',
      action: 'sync_auto',
      detail: [
        `eBay: ${ebayResult ? `${ebayResult.new} new, ${ebayResult.updated} updated` : `failed – ${ebayErr}`}`,
        `Finance: ${financeResult ? `${financeResult.linked} linked` : `failed – ${financeErr}`}`,
        `(${durationSecs}s)`,
      ].join(' | '),
    })

    return NextResponse.json({
      ok: true,
      duration: `${durationSecs}s`,
      ebay:    ebayResult    ?? { error: ebayErr },
      finance: financeResult ?? { error: financeErr },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
