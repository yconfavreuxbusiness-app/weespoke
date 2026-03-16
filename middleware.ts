import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect dashboard routes
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  // Check for session cookie
  const session = req.cookies.get('ws_session')
  if (!session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  try {
    const data = JSON.parse(session.value)
    if (!data.expires || Date.now() > data.expires) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
