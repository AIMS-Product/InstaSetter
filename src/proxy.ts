import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Basic-auth gate for /dashboard/* only.
 *
 * Local dev can run without credentials. Deployed environments fail closed if
 * credentials are missing, because a misconfigured deploy should not expose the
 * operator dashboard.
 */
export function dashboardAuthGate(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith('/dashboard')) return null

  const user = process.env.DASHBOARD_AUTH_USER
  const pass = process.env.DASHBOARD_AUTH_PASSWORD
  if (!user || !pass) {
    if (isDeployedRuntime()) {
      return new NextResponse('Dashboard authentication is not configured', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    return null
  }

  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6).trim())
      const sep = decoded.indexOf(':')
      const providedUser = sep === -1 ? decoded : decoded.slice(0, sep)
      const providedPass = sep === -1 ? '' : decoded.slice(sep + 1)
      if (providedUser === user && providedPass === pass) return null
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate':
        'Basic realm="InstaSetter Dashboard", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

function isDeployedRuntime(): boolean {
  const vercelEnv = process.env.VERCEL_ENV
  return (
    vercelEnv === 'production' ||
    vercelEnv === 'preview' ||
    process.env.NODE_ENV === 'production'
  )
}

export async function proxy(request: NextRequest) {
  const gateResp = dashboardAuthGate(request)
  if (gateResp) return gateResp
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
