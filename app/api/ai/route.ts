import { NextRequest, NextResponse } from 'next/server'
import { getDb, OrderRow } from '@/lib/db'
import { withEffective, liveSummary, byProduct, byCountry, byMonth } from '@/lib/calculations'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const body    = await request.json() as { messages: Array<{ role: string; content: string }> }
    const db      = getDb()
    const rows    = db.prepare('SELECT * FROM orders ORDER BY date DESC').all() as unknown as OrderRow[]
    const orders  = withEffective(rows)
    const summary = liveSummary(orders)
    const monthly = byMonth(orders).slice(-6)
    const products = byProduct(orders).slice(0, 20)
    const countries = byCountry(orders).slice(0, 10)

    const systemPrompt = `You are an intelligent business assistant for an eBay dropshipping operation based in the UK.
You have access to full real-time business data. Use it to give specific, data-driven answers.

## LIVE BUSINESS DATA
Total Orders: ${summary.orderCount}
Total Revenue (ex-VAT): £${summary.totalRevenue.toFixed(2)}
Total Payout (from eBay): £${summary.totalPayout.toFixed(2)}
Total Cost: £${summary.totalCost.toFixed(2)}
Gross Profit: £${summary.totalProfit.toFixed(2)}
Avg Margin: ${summary.avgMargin.toFixed(1)}%
Refunds: ${summary.refundCount}
Orders Missing Cost: ${summary.missingCostCount}

## LAST 6 MONTHS
${monthly.map(m => `${m.label}: ${m.orders} orders, £${m.revenue.toFixed(0)} revenue, £${m.profit.toFixed(0)} profit, ${m.margin.toFixed(1)}% margin`).join('\n')}

## TOP PRODUCTS (by order count)
${products.slice(0, 10).map(p => `- ${p.product.slice(0,60)} | ${p.orders} orders | avg payout £${p.avgPayout.toFixed(2)} | avg cost £${p.avgCost.toFixed(2)} | margin ${p.margin.toFixed(1)}%`).join('\n')}

## TOP COUNTRIES
${countries.map(c => `- ${c.country}: ${c.orders} orders, £${c.profit.toFixed(0)} profit, ${c.margin.toFixed(1)}% margin`).join('\n')}

## YOUR CAPABILITIES
1. **Order Entry**: If the user describes orders they want to log (e.g. "I sold 3 Solar Lights to Germany, cost £4.20, order ID 12345"), extract the data and respond with a JSON block:
\`\`\`orders
[{"id":"...","product":"...","date":"YYYY-MM-DD","country":"...","price":0,"payout":0,"cost":0,"status":"Completed"}]
\`\`\`
The frontend will parse this and create the orders. Ask for any missing critical fields (id, product, payout/price, cost).

2. **P&L Questions**: Answer questions about profit, trends, margin, best/worst months.

3. **Pricing Advice**: Identify loss-making products and calculate the minimum price needed for 20% margin.
   Formula: minPrice = (cost / 0.80) / (1 - avgFvfRate) where avgFvfRate ≈ 0.109

4. **Product Launch Ideas**: Based on profitable product patterns, suggest what to source and sell next.

Always be specific — quote actual numbers from the data. Keep responses concise and actionable.`

    const messages = body.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-5',
      max_tokens: 1500,
      system:     systemPrompt,
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const text = textBlock?.type === 'text' ? textBlock.text : ''

    // Parse any order JSON blocks the AI returned
    const orderMatch = text.match(/```orders\n([\s\S]*?)\n```/)
    let parsedOrders: unknown[] = []
    if (orderMatch) {
      try {
        parsedOrders = JSON.parse(orderMatch[1])
        // Auto-insert them
        for (const o of parsedOrders as Record<string, unknown>[]) {
          const id = (o.id as string) || `AI-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
          db.prepare(`
            INSERT OR IGNORE INTO orders
              (id, date, product, buyer, postcode, country, price, payout, cost, fvf,
               profit, margin, status, ebay_synced)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)
          `).run(
            id,
            (o.date as string) || new Date().toISOString().split('T')[0],
            (o.product as string) || 'Unknown',
            (o.buyer as string) || '',
            '',
            (o.country as string) || '',
            Number(o.price  || 0),
            Number(o.payout || 0),
            Number(o.cost   || 0),
            Number((o.payout as number || 0) * 0.109),
            Number(o.payout || 0) - Number(o.cost || 0),
            Number(o.payout || 0) > 0
              ? ((Number(o.payout || 0) - Number(o.cost || 0)) / Number(o.payout || 0)) * 100
              : 0,
            (o.status as string) || 'Completed',
          )
        }
      } catch (_) {}
    }

    return NextResponse.json({ text, ordersCreated: parsedOrders.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
