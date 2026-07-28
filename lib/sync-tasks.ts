import { getDb } from '@/lib/db'
import { ebayFetch } from '@/lib/ebay'
import { countryName } from '@/lib/utils'
import { logActivity } from '@/lib/logger'

// ─── Fulfillment ────────────────────────────────────────────────────────────

const PROTECTED_STATUSES = new Set([
  'Completed','Refunded','Refunded - Awaiting Supplier Refund','Partial Refund','Cancelled',
])
const DELIVERY_DAYS = 21
const LIMIT = 200

function statusFromEbay(s: string): string {
  if (s === 'NOT_STARTED') return 'Label Created'
  if (s === 'IN_PROGRESS')  return 'Dispatched'
  if (s === 'FULFILLED')    return 'Dispatched'
  return 'In Progress'
}

function statusFromDispatch(d: string): string {
  const days = (Date.now() - new Date(d).getTime()) / 86400000
  return days >= DELIVERY_DAYS ? 'Completed' : 'Dispatched'
}

async function fetchAllOrders(sinceDate: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  const filter = `creationdate:[${sinceDate}..]`
  let offset = 0
  while (true) {
    const data = await ebayFetch(
      `/sell/fulfillment/v1/order?filter=${encodeURIComponent(filter)}&limit=${LIMIT}&offset=${offset}&fieldgroups=TAX_BREAKDOWN`
    ) as { orders?: unknown[]; total?: number }
    const page = (data.orders || []) as Record<string, unknown>[]
    all.push(...page)
    if (page.length < LIMIT) break
    offset += LIMIT
  }
  return all
}

export async function runFulfillmentSync(user: string, opts: { fullSync?: boolean; since?: string } = {}) {
  const defaultDays = opts.fullSync ? 365 : 180
  const sinceDate   = opts.since || new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString()
  const ebayOrders  = await fetchAllOrders(sinceDate)
  const db          = getDb()

  const insert = db.prepare(`
    INSERT OR IGNORE INTO orders
      (id, date, product, buyer, postcode, country, country_code,
       quantity, variation, tracking,
       price, payout, fvf, profit, margin, status, ebay_line_item_id, ebay_synced)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
  `)

  const updateStatus = db.prepare(`
    UPDATE orders SET status=?, ebay_line_item_id=?, updated_at=datetime('now')
    WHERE id=? AND ebay_synced=1
      AND status NOT IN ('Completed','Refunded','Refunded - Awaiting Supplier Refund','Partial Refund','Cancelled')
  `)

  const updateExisting = db.prepare(`
    UPDATE orders SET
      country      = CASE WHEN country      = '' OR country      IS NULL THEN ? ELSE country      END,
      country_code = CASE WHEN country_code = '' OR country_code IS NULL THEN ? ELSE country_code END,
      postcode     = CASE WHEN postcode     = '' OR postcode     IS NULL THEN ? ELSE postcode     END,
      buyer        = CASE WHEN buyer        = '' OR buyer        IS NULL THEN ? ELSE buyer        END,
      tracking     = CASE WHEN tracking     = '' OR tracking     IS NULL THEN ? ELSE tracking     END,
      quantity     = CASE WHEN quantity     IS NULL OR quantity  = 1      THEN ? ELSE quantity     END,
      variation    = CASE WHEN variation    = '' OR variation    IS NULL THEN ? ELSE variation    END,
      updated_at   = datetime('now')
    WHERE id = ?
  `)

  let newCount = 0, updatedCount = 0
  db.exec('BEGIN')
  try {
    for (const o of ebayOrders) {
      const lineItem    = (o.lineItems as Record<string,unknown>[])?.[0] || {}
      const pricing     = o.pricingSummary as Record<string, Record<string, string>> || {}
      const price       = parseFloat(pricing?.priceSubtotal?.value || pricing?.total?.value || '0')
      const fvf         = parseFloat((o.totalMarketplaceFee as Record<string, string>)?.value || String(price * 0.109))
      const payout      = parseFloat((price - fvf).toFixed(2))
      const ebayStatus  = statusFromEbay(o.orderFulfillmentStatus as string)

      const shippingStep = ((o.fulfillmentStartInstructions as Record<string,unknown>[])?.[0] as Record<string,unknown>)?.shippingStep as Record<string,unknown> || {}
      const shipTo       = shippingStep?.shipTo as Record<string,unknown> || {}
      const contactAddr  = shipTo?.contactAddress as Record<string,string> || {}
      const postcode     = contactAddr?.postalCode || ''
      const countryCode  = (contactAddr?.countryCode || '').toUpperCase()
      const country      = countryName(countryCode)
      const buyer        = ((shipTo?.fullName as string) || (o.buyer as Record<string,string>)?.username || '').trim()
      const fulfillments = (o.fulfillments as Record<string,string>[]) || []
      const tracking     = fulfillments[0]?.shipmentTrackingNumber || fulfillments[0]?.trackingNumber || ''
      const quantity     = Number(lineItem.quantity || 1)
      const varAspects   = (lineItem.variationAspects as Array<{localizedAspectName: string; value: string}>) || []
      const variation    = varAspects.map(a => `${a.localizedAspectName}: ${a.value}`).join(', ')
      const lineItemId   = (lineItem.lineItemId as string) || ''
      const orderId      = o.orderId as string

      const existing = db.prepare('SELECT id, status, tracking, dispatch FROM orders WHERE id = ?').get(orderId) as Record<string, string> | null

      if (existing) {
        if (!PROTECTED_STATUSES.has(existing.status)) {
          const refined = (o.orderFulfillmentStatus === 'FULFILLED' && existing.dispatch)
            ? statusFromDispatch(existing.dispatch)
            : ebayStatus
          updateStatus.run(refined, lineItemId, orderId)
        }
        updateExisting.run(country, countryCode, postcode, buyer, tracking, quantity, variation, orderId)
        updatedCount++
      } else {
        insert.run(orderId, (o.creationDate as string)?.split('T')[0] || '', (lineItem.title as string) || '',
          buyer, postcode, country, countryCode, quantity, variation, tracking,
          price, payout, fvf, payout, 0, ebayStatus, lineItemId)
        newCount++
      }
    }
    db.exec('COMMIT')
  } catch (e) { db.exec('ROLLBACK'); throw e }

  logActivity({ user, action: 'sync_ebay', entityType: 'sync', detail: `${newCount} new, ${updatedCount} updated (${ebayOrders.length} fetched)` })
  return { new: newCount, updated: updatedCount, total: ebayOrders.length }
}

// ─── Finance ────────────────────────────────────────────────────────────────

async function fetchTransactionsByType(type: string, days: number): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
  const fromDate  = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const dateRange = `${fromDate}T00:00:00.000Z..${new Date(Date.now() - 5 * 60 * 1000).toISOString()}`
  let offset = 0
  while (true) {
    const qs   = new URLSearchParams({ transactionType: type, transactionDateRange: dateRange, limit: '200', offset: String(offset) }).toString()
    const data = await ebayFetch(`/sell/finances/v1/transaction?${qs}`) as Record<string, unknown>
    const items = (data.transactions || []) as Record<string, unknown>[]
    results.push(...items)
    const total = Number(data.total || 0)
    offset += items.length
    if (offset >= total || items.length === 0) break
  }
  return results
}

export async function runFinanceSync(user: string, opts: { days?: number } = {}) {
  const days         = opts.days || 180
  const transactions = await fetchTransactionsByType('SALE', days)
  const refunds      = await fetchTransactionsByType('REFUND', days)
  const db           = getDb()

  // ── Update payout/fvf from SALE transactions ──────────────────────────────
  const updateOrder = db.prepare(`
    UPDATE orders SET
      fvf        = ?,
      ad_fee     = ?,
      payout     = ?,
      profit     = ? - ad_fee - cost,
      margin     = CASE WHEN ? > 0 THEN (? - ad_fee - cost) / ? * 100 ELSE 0 END,
      updated_at = datetime('now')
    WHERE id = ? AND ebay_synced = 1
      AND status NOT IN ('Completed','Refunded','Partial Refund','Refunded - Awaiting Supplier Refund','Cancelled')
  `)

  let linked = 0
  for (const tx of transactions) {
    const orderId = (tx.orderId as string) || ''
    if (!orderId) continue
    const payout = parseFloat(((tx.amount as Record<string,unknown>)?.value as string) || '0')
    const fvf    = parseFloat(((tx.totalFeeAmount as Record<string,unknown>)?.value as string) || '0')
    if (payout <= 0) continue
    const result = updateOrder.run(fvf, 0, payout, payout, payout, payout, payout, orderId) as { changes: number }
    linked += result.changes
  }

  // ── Mark refunded orders from REFUND transactions ─────────────────────────
  const markRefunded = db.prepare(`
    UPDATE orders SET
      payout     = 0,
      fvf        = 0,
      profit     = 0,
      margin     = 0,
      status     = 'Refunded',
      updated_at = datetime('now')
    WHERE id = ? AND ebay_synced = 1
      AND status NOT IN ('Refunded', 'Cancelled')
  `)

  let refundedCount = 0
  for (const tx of refunds) {
    const orderId = (tx.orderId as string) || ''
    if (!orderId) continue
    const result = markRefunded.run(orderId) as { changes: number }
    refundedCount += result.changes
  }

  logActivity({
    user, action: 'sync_finance', entityType: 'sync',
    detail: `${linked} orders updated from ${transactions.length} SALE transactions | ${refundedCount} orders marked Refunded from ${refunds.length} REFUND transactions`,
  })
  return { transactions: transactions.length, linked, refunds: refunds.length, refundedCount }
}
