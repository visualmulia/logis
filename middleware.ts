import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CUSTOM_DOMAIN = 'www.logis-app.web.id'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = url.hostname

  // Hanya redirect di production & jika akses dari Vercel subdomain (bukan custom domain)
  if (
    process.env.NODE_ENV === 'production' &&
    hostname !== CUSTOM_DOMAIN &&
    hostname !== 'localhost'
  ) {
    url.hostname = CUSTOM_DOMAIN
    url.port = ''
    return NextResponse.redirect(url, 308) // 308 = permanent redirect, method & body preserved
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|firebase-messaging-sw.js|icons/).*)',
  ],
}
