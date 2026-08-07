import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface StRow { step_order: number; label: string; done: number }

export async function POST(req: NextRequest) {
  try {
    const { obligationId, messages } = await req.json() as {
      obligationId: string
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    const db = getDb()

    const ob = db.prepare(
      `SELECT title, description, due_date, submit_to, submit_url FROM compliance_obligations WHERE id = ?`
    ).get(obligationId) as {
      title: string; description: string; due_date: string; submit_to: string; submit_url: string
    } | null

    if (!ob) return NextResponse.json({ error: 'Obligation not found' }, { status: 404 })

    const subtasks = db.prepare(
      `SELECT step_order, label, done FROM compliance_subtasks WHERE obligation_id = ? ORDER BY step_order`
    ).all(obligationId) as unknown as StRow[]

    const dueDate = new Date(ob.due_date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const stepsList = subtasks.map(s =>
      `  ${s.done ? '✓' : '○'} Step ${s.step_order}: ${s.label}`
    ).join('\n')

    const systemPrompt = `You are a UK business compliance assistant helping the director of THE LIFESTYLE TRADING COMPANY LTD.

## Company Details
- Company Name: THE LIFESTYLE TRADING COMPANY LTD
- Company Number: 17097033
- Type: Private Limited Company (UK)
- Incorporated: 17 March 2026
- Registered Address: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ
- Accounting Year-End: 31 March 2027
- Business: eBay dropshipping (SIC 47910)
- Has an accountant: No (managing compliance independently)
- Background: Was a sole trader in February 2026, incorporated in March 2026

## Current Obligation They Are Working On
Title: ${ob.title}
Description: ${ob.description}
Due Date: ${dueDate}
Submit To: ${ob.submit_to}
${ob.submit_url ? `Submission URL: ${ob.submit_url}` : ''}

## Checklist Progress
${stepsList || 'No steps defined'}

## Your Role
Help the user understand and complete this specific compliance obligation. Be:
- Clear and jargon-free — explain as if to a first-time UK limited company director
- Specific to their situation (company number, dates, their eBay business)
- Practical — tell them exactly what to do, where to click, what to look for
- Encouraging — compliance is daunting; reassure them when steps are straightforward
- Accurate about UK tax/company law (HMRC, Companies House rules)

If they ask about a specific step, explain what it means, why it matters, and how to do it.
If they ask about deadlines, give their specific dates.
If you are unsure about something, say so clearly and suggest they verify with HMRC or Companies House directly.
Keep responses concise — 2-4 short paragraphs maximum unless they ask for detail.`

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-5',
      max_tokens: 1000,
      system:     systemPrompt,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    return NextResponse.json({ text })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
