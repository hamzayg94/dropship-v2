import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ebayFetch } from '@/lib/ebay'
import { countryName } from '@/lib/utils'

// Fetch one page of eBay orders for a date range window
async function fetchWindow(from: string, to: string): Promise<unknown[]> {
  const filter = `creationdate:[${from}..${to}]`
  let results: unknown[] = []
  let offset = 0

  while (true) {
    const data = await ebayFetch(
      `/sell/fulfillment/v1/order?filter=${encodeURIComponent(filter)}&limit=200&offset=${offset}`
    ) as { orders?: unknown[]; total?: number }

    const page = data.orders || []
    results = results.concat(page)
    const total = Number(data.total || 0)
    offset += page.length
    if (offset >= total || page.length === 0) break
  }

  return results
}

export async function POST() {
  try {
    const db = getDb()

    // Find the oldest order date in the DB to know how far back to go
    const oldest = db.prepare(
      `SELECT MIN(date) as d FROM orders WHERE ebay_synced = 1`
    ).get() as unknown as { d: string | null }

    const fromDate = oldest?.d
      ? new Date(oldest.d)
      : new Date(Date.now() - 365 * 86400000) // fallback: 1 year

    // Chunk into 89-day windows (eBay max per query)
    // Cap to 5 minutes ago — eBay rejects end dates at exact current time
    const windows: Array<{ from: string; to: string }> = []
    const cursor = new Date(fromDate)
    const now = new Date(Date.now() - 5 * 60 * 1000)

    while (cursor < now) {
      const windowEnd = new Date(cursor)
      windowEnd.setDate(windowEnd.getDate() + 89)
      if (windowEnd > now) windowEnd.setTime(now.getTime())

      windows.push({
        from: cursor.toISOString(),
        to:   windowEnd.toISOString(),
      })

      cursor.setDate(cursor.getDate() + 90)
    }

    const updateCountry = db.prepare(`
      UPDATE orders SET
        country      = CASE WHEN country      = '' OR country      IS NULL THEN ? ELSE country      END,
        country_code = CASE WHEN country_code = '' OR country_code IS NULL THEN ? ELSE country_code END,
        updated_at   = datetime('now')
      WHERE id = ?
    `)

    let totalFetched = 0
    let totalUpdated = 0

    for (const w of windows) {
      const ebayOrders = await fetchWindow(w.from, w.to)
      totalFetched += ebayOrders.length

      db.exec('BEGIN')
      try {
        for (const o of ebayOrders as Record<string, unknown>[]) {
          const orderId  = o.orderId as string
          const buyerAddr = ((o.fulfillmentStartInstructions as Record<string,unknown>[])?.[0] as Record<string,unknown>)
            ?.shippingStep as Record<string, Record<string, string>> | undefined
          const code    = (((buyerAddr as unknown as Record<string, Record<string, Record<string, string>>>)?.shipTo?.contactAddress?.countryCode) || '').toUpperCase()
          const country = countryName(code)

          if (!orderId || !country) continue

          const result = updateCountry.run(country, code, orderId) as { changes: number }
          totalUpdated += result.changes
        }
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    }

    // How many still missing after backfill
    const stillMissing = (db.prepare(
      `SELECT COUNT(*) as c FROM orders WHERE ebay_synced = 1 AND (country IS NULL OR country = '')`
    ).get() as unknown as { c: number }).c

    return NextResponse.json({
      ok: true,
      windows: windows.length,
      fetched: totalFetched,
      updated: totalUpdated,
      stillMissing,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
