import { NextRequest, NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'
import { logActivity } from '@/lib/logger'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const order  = getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | null
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id }   = await ctx.params
    const body     = await request.json() as Partial<OrderRow>
    const db       = getDb()
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | null
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const merged = { ...existing, ...body }
    let payout = Number(merged.payout || 0)
    let cost   = Number(merged.cost   || 0)
    let fvf    = Number(merged.fvf    || 0)
    let adFee  = Number(merged.ad_fee || 0)

    const statusChanged = body.status && body.status !== existing.status

    if (statusChanged) {
      if (merged.status === 'Refunded' || merged.status === 'Cancelled') {
        // Full wash — both sides zeroed
        payout = 0; cost = 0; fvf = 0; adFee = 0
      } else if (merged.status === 'Refunded - Awaiting Supplier Refund') {
        // Buyer refunded, supplier hasn't paid back yet — cost stays as loss
        payout = 0; fvf = 0; adFee = 0
      }
      // Partial Refund: no automatic change — user updates payout manually
    }

    const profit = payout - adFee - cost
    const margin = payout > 0 ? (profit / payout) * 100 : 0

    db.prepare(`
      UPDATE orders SET
        date=?, product=?, buyer=?, postcode=?, country=?, country_code=?,
        quantity=?, variation=?,
        price=?, payout=?, cost=?, fvf=?, ad_fee=?,
        profit=?, margin=?,
        status=?, supplier=?, supplier_link=?, tracking=?, dispatch=?,
        supplier_order_id=?, notes=?, supplier_refunded=?,
        updated_at=datetime('now')
      WHERE id=?
    `).run(
      merged.date, merged.product, merged.buyer, merged.postcode,
      merged.country, merged.country_code,
      Number(merged.quantity || 1), merged.variation || '',
      Number(merged.price || 0), payout, cost,
      fvf, adFee,
      profit, margin,
      merged.status, merged.supplier, merged.supplier_link,
      merged.tracking, merged.dispatch,
      merged.supplier_order_id, merged.notes,
      Number(merged.supplier_refunded ?? 1),
      id,
    )

    const user = request.headers.get('x-username') || 'unknown'
    const changes: string[] = []
    if (body.status && body.status !== existing.status)
      changes.push(`Status: ${existing.status} → ${body.status}`)
    if (body.cost !== undefined && Number(body.cost) !== Number(existing.cost))
      changes.push(`Cost: £${Number(existing.cost).toFixed(2)} → £${Number(body.cost).toFixed(2)}`)
    if (body.payout !== undefined && Number(body.payout) !== Number(existing.payout))
      changes.push(`Payout: £${Number(existing.payout).toFixed(2)} → £${Number(body.payout).toFixed(2)}`)

    logActivity({
      user,
      action:     'order_updated',
      entityType: 'order',
      entityId:   id,
      detail:     changes.length ? changes.join(' | ') : 'Order saved',
      oldValue:   body.status && body.status !== existing.status ? existing.status : undefined,
      newValue:   body.status && body.status !== existing.status ? body.status    : undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id }   = await ctx.params
    const user     = req.headers.get('x-username') || 'unknown'
    const existing = getDb().prepare('SELECT product FROM orders WHERE id = ?').get(id) as { product: string } | null
    getDb().prepare('DELETE FROM orders WHERE id = ?').run(id)
    logActivity({ user, action: 'order_deleted', entityType: 'order', entityId: id, detail: existing?.product || id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
