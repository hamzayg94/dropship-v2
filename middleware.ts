import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/session'

const PUBLIC = ['/login', '/api/session', '/api/auth', '/api/cron', '/api/migrate/upload-db']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token    = req.cookies.get('ds_session')?.value
  const username = token ? await verifyToken(token) : null

  if (!username) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  const res = NextResponse.next()
  res.headers.set('x-username', username)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
