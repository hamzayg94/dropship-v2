import { NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'
import { withEffective, liveSummary, byMonth, byProduct, byCountry } from '@/lib/calculations'

interface ExpenseRow { month: string; category: string; description: string; amount: number }

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db      = getDb() as any
    const rows    = db.prepare('SELECT * FROM orders ORDER BY date DESC').all() as unknown as OrderRow[]
    const orders  = withEffective(rows)
    const summary = liveSummary(orders)
    const months  = byMonth(orders)
    const products  = byProduct(orders)
    const countries = byCountry(orders)

    // Monthly operating expenses
    const expenseRows = db.prepare('SELECT * FROM monthly_expenses ORDER BY month DESC').all() as ExpenseRow[]

    // Totals by category for the waterfall
    const totalByCategory: Record<string, number> = {}
    for (const e of expenseRows) {
      totalByCategory[e.category] = (totalByCategory[e.category] || 0) + e.amount
    }
    const totalSubscription = totalByCategory['subscription'] || 0
    const totalPostage      = totalByCategory['postage']      || 0
    const totalOther        = totalByCategory['other']        || 0
    const totalExpenses     = totalSubscription + totalPostage + totalOther
    const netProfit         = summary.totalProfit - totalExpenses

    // Merge monthly expenses into month buckets
    const expenseByMonth: Record<string, number> = {}
    for (const e of expenseRows) {
      expenseByMonth[e.month] = (expenseByMonth[e.month] || 0) + e.amount
    }
    for (const b of months) {
      b.expenses  = expenseByMonth[b.month] || 0
      b.netProfit = b.profit - b.expenses
    }

    // Gross sales from active (non-refunded/cancelled) orders only
    const grossSales = orders.reduce((s, o) => s + (o.isFullRefund ? 0 : Number(o.price || 0)), 0)
    const vat        = grossSales - summary.totalRevenue

    // Waterfall — correctly ordered, no double-counting
    const waterfall = [
      { label: 'Gross Sales (VAT-inclusive)',  value: grossSales,              note: 'eBay listing price incl. 20% VAT', sign: '' },
      { label: 'VAT (est. 16.7% of gross)',    value: vat,                     note: 'Collected & remitted by eBay',     sign: '−' },
      { label: 'Net Revenue (ex-VAT)',         value: summary.totalRevenue,    note: 'eBay Finance API basis',           sign: '=' },
      { label: 'eBay Final Value Fees',        value: summary.totalFVF,        note: 'Already deducted from payout',     sign: '−' },
      { label: 'Net Payout from eBay',         value: summary.totalPayout,     note: 'Actual per-order bank deposits',   sign: '=' },
      { label: 'Promoted Listing Ad Fees',     value: summary.totalAdFees,     note: 'Charged separately by eBay',       sign: '−' },
      { label: 'Supplier Costs',               value: summary.totalCost,       note: `${rows.filter(o=>Number(o.cost||0)>0).length} of ${rows.length} orders costed`, sign: '−' },
      { label: 'Gross Profit',                 value: summary.totalProfit,     note: `${summary.avgMargin.toFixed(1)}% avg margin`, sign: '=' },
      { label: 'eBay Shop Subscription',       value: totalSubscription,       note: 'Monthly subscription fee',         sign: '−' },
      { label: 'Postage Labels',               value: totalPostage,            note: 'eBay postage label charges',       sign: '−' },
      ...(totalOther > 0 ? [{ label: 'Other Expenses', value: totalOther, note: 'Miscellaneous overheads', sign: '−' }] : []),
      { label: 'Net Profit',                   value: netProfit,               note: 'After all costs & overheads',      sign: '=' },
    ]

    // Supplier breakdown
    const supplierMap: Record<string, { supplier: string; orders: number; cost: number; profit: number }> = {}
    for (const o of orders) {
      const s = o.supplier || 'No Supplier'
      if (!supplierMap[s]) supplierMap[s] = { supplier: s, orders: 0, cost: 0, profit: 0 }
      supplierMap[s].orders++
      supplierMap[s].cost   += o.effectiveCost
      supplierMap[s].profit += o.effectiveProfit
    }
    const suppliers = Object.values(supplierMap).sort((a, b) => b.orders - a.orders)

    return NextResponse.json({
      summary, waterfall, months, products, countries, suppliers,
      expenses: expenseRows,
      totals: { subscription: totalSubscription, postage: totalPostage, other: totalOther, total: totalExpenses },
      netProfit,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
