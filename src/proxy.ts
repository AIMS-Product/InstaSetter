import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { checkDashboardBasicAuth } from '@/lib/dashboard-auth'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const auth = checkDashboardBasicAuth(request.headers.get('authorization'))
  if (!auth.ok) {
    return new NextResponse(auth.message, {
      status: auth.status,
      headers: auth.wwwAuthenticate
        ? { 'WWW-Authenticate': auth.wwwAuthenticate }
        : undefined,
    })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - API webhooks (validated by each route)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks).*)',
  ],
}
