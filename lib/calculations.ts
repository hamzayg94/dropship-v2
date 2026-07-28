import { OrderRow } from './db'
import { REFUND_STATUSES } from './utils'

export interface EffectiveOrder extends OrderRow {
  effectivePayout:  number
  effectiveAdFee:   number
  effectiveCost:    number
  effectiveRevenue: number
  effectiveProfit:  number
  effectiveMargin:  number
  isFullRefund:     boolean
  isPartialRefund:  boolean
  isRefunded:       boolean
}

export function withEffective(orders: OrderRow[]): EffectiveOrder[] {
  return orders.map(o => {
    const isFullRefund    = o.status === 'Refunded' || o.status === 'Cancelled'
    const isPartialRefund = o.status === 'Partial Refund'
    const isRefunded      = REFUND_STATUSES.has(o.status)

    const effectivePayout = isFullRefund ? 0 : Number(o.payout || 0)
    const effectiveAdFee  = isFullRefund ? 0 : Number(o.ad_fee || 0)
    // Cost is a loss if supplier didn't refund, otherwise 0
    const effectiveCost   = isFullRefund
      ? (Number(o.supplier_refunded ?? 1) === 0 ? Number(o.cost || 0) : 0)
      : Number(o.cost || 0)

    // Revenue = net payout + FVF re-added (ex-VAT basis). Ad fees are NOT revenue.
    const effectiveRevenue = effectivePayout > 0
      ? effectivePayout + Number(o.fvf || 0)
      : 0

    const effectiveProfit = effectivePayout - effectiveAdFee - effectiveCost
    const effectiveMargin = effectivePayout > 0
      ? (effectiveProfit / effectivePayout) * 100
      : 0

    return {
      ...o,
      effectivePayout,
      effectiveAdFee,
      effectiveCost,
      effectiveRevenue,
      effectiveProfit,
      effectiveMargin,
      isFullRefund,
      isPartialRefund,
      isRefunded,
    }
  })
}

export interface LiveSummary {
  totalRevenue:     number
  totalFVF:         number
  totalAdFees:      number
  totalPayout:      number
  totalCost:        number
  totalProfit:      number
  avgMargin:        number
  orderCount:       number
  revenueCount:     number
  refundCount:      number
  avgOrderValue:    number
  missingCostCount: number
}

export function liveSummary(orders: EffectiveOrder[]): LiveSummary {
  let totalRevenue = 0, totalFVF = 0, totalAdFees = 0
  let totalPayout = 0, totalCost = 0, totalProfit = 0
  let revenueCount = 0, refundCount = 0, missingCostCount = 0

  for (const o of orders) {
    totalRevenue  += o.effectiveRevenue
    totalFVF      += o.isFullRefund ? 0 : Number(o.fvf    || 0)
    totalAdFees   += o.effectiveAdFee
    totalPayout   += o.effectivePayout
    totalCost     += o.effectiveCost
    totalProfit   += o.effectiveProfit
    if (o.effectiveRevenue > 0) revenueCount++
    if (o.isRefunded) refundCount++
    if (!o.isFullRefund && Number(o.cost || 0) === 0) missingCostCount++
  }

  const avgMargin     = totalPayout > 0 ? (totalProfit / totalPayout) * 100 : 0
  const avgOrderValue = revenueCount > 0 ? totalRevenue / revenueCount : 0

  return {
    totalRevenue, totalFVF, totalAdFees,
    totalPayout, totalCost, totalProfit,
    avgMargin, orderCount: orders.length,
    revenueCount, refundCount, avgOrderValue, missingCostCount,
  }
}

export interface MonthBucket {
  label:     string
  month:     string
  orders:    number
  revenue:   number
  payout:    number
  adFees:    number
  cost:      number
  profit:    number
  margin:    number
  refunds:   number
  expenses:  number  // monthly overhead from monthly_expenses table (filled by P&L route)
  netProfit: number  // profit - expenses
}

export function byMonth(orders: EffectiveOrder[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  for (const o of orders) {
    const m = (o.date || '').slice(0, 7)
    if (!m) continue
    if (!map.has(m)) {
      const [y, mo] = m.split('-')
      const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      map.set(m, { label, month: m, orders: 0, revenue: 0, payout: 0, adFees: 0, cost: 0, profit: 0, margin: 0, refunds: 0, expenses: 0, netProfit: 0 })
    }
    const b = map.get(m)!
    b.orders++
    b.revenue += o.effectiveRevenue
    b.payout  += o.effectivePayout
    b.adFees  += o.effectiveAdFee
    b.cost    += o.effectiveCost
    b.profit  += o.effectiveProfit
    if (o.isRefunded) b.refunds++
  }
  const buckets = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
  for (const b of buckets) {
    b.margin = b.payout > 0 ? (b.profit / b.payout) * 100 : 0
  }
  return buckets
}

export interface ProductBucket {
  product:    string
  orders:     number
  revenue:    number
  payout:     number
  adFees:     number
  cost:       number
  profit:     number
  margin:     number
  refunds:    number
  avgCost:    number
  avgPayout:  number
  hasCost:    boolean
}

export function byProduct(orders: EffectiveOrder[]): ProductBucket[] {
  const map = new Map<string, ProductBucket>()
  for (const o of orders) {
    const key = (o.product || 'Unknown').trim()
    if (!map.has(key)) {
      map.set(key, { product: key, orders: 0, revenue: 0, payout: 0, adFees: 0, cost: 0, profit: 0, margin: 0, refunds: 0, avgCost: 0, avgPayout: 0, hasCost: false })
    }
    const b = map.get(key)!
    b.orders++
    b.revenue += o.effectiveRevenue
    b.payout  += o.effectivePayout
    b.adFees  += o.effectiveAdFee
    b.cost    += o.effectiveCost
    b.profit  += o.effectiveProfit
    if (o.isRefunded) b.refunds++
    if (Number(o.cost || 0) > 0) b.hasCost = true
  }
  const buckets = Array.from(map.values())
  for (const b of buckets) {
    b.margin    = b.payout > 0 ? (b.profit / b.payout) * 100 : 0
    b.avgCost   = b.orders > 0 ? b.cost   / b.orders : 0
    b.avgPayout = b.orders > 0 ? b.payout / b.orders : 0
  }
  return buckets.sort((a, b) => b.orders - a.orders)
}

export interface CountryBucket {
  country: string
  orders:  number
  revenue: number
  payout:  number
  cost:    number
  profit:  number
  margin:  number
  refunds: number
}

export function byCountry(orders: EffectiveOrder[]): CountryBucket[] {
  const map = new Map<string, CountryBucket>()
  for (const o of orders) {
    const c = o.country || 'Unknown'
    if (!map.has(c)) map.set(c, { country: c, orders: 0, revenue: 0, payout: 0, cost: 0, profit: 0, margin: 0, refunds: 0 })
    const b = map.get(c)!
    b.orders++
    b.revenue += o.effectiveRevenue
    b.payout  += o.effectivePayout
    b.cost    += o.effectiveCost
    b.profit  += o.effectiveProfit
    if (o.isRefunded) b.refunds++
  }
  const buckets = Array.from(map.values())
  for (const b of buckets) b.margin = b.payout > 0 ? (b.profit / b.payout) * 100 : 0
  return buckets.sort((a, b) => b.orders - a.orders)
}
