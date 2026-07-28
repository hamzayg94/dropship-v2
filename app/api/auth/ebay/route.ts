import { NextResponse } from 'next/server'

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
].join(' ')

function getAuthBase() {
  return process.env.EBAY_ENVIRONMENT === 'production'
    ? 'https://auth.ebay.com'
    : 'https://auth.sandbox.ebay.com'
}

export async function GET() {
  const clientId = process.env.EBAY_APP_ID
  const ruName   = process.env.EBAY_RU_NAME

  if (!clientId || !ruName) {
    return NextResponse.json({ error: 'EBAY_APP_ID and EBAY_RU_NAME must be set in .env.local' }, { status: 500 })
  }

  const url = `${getAuthBase()}/oauth2/authorize?` + new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  ruName,
    response_type: 'code',
    scope:         SCOPES,
    prompt:        'login',
  })

  return NextResponse.redirect(url)
}
