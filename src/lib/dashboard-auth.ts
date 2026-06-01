type DashboardAuthDecision =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string; wwwAuthenticate?: string }

function dashboardCredentials(): { username: string; password: string } | null {
  const username =
    process.env.DASHBOARD_BASIC_AUTH_USERNAME ??
    process.env.DASHBOARD_BASIC_AUTH_USER
  const password = process.env.DASHBOARD_BASIC_AUTH_PASSWORD

  if (!username || !password) return null
  return { username, password }
}

function dashboardAuthRequired(): boolean {
  if (dashboardCredentials()) return true
  return process.env.VERCEL_ENV === 'production'
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function decodeBasicAuth(
  value: string
): { username: string; password: string } | null {
  if (!value.startsWith('Basic ')) return null
  try {
    const decoded = atob(value.slice('Basic '.length))
    const separator = decoded.indexOf(':')
    if (separator < 0) return null
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    }
  } catch {
    return null
  }
}

export function checkDashboardBasicAuth(
  authorization: string | null
): DashboardAuthDecision {
  const credentials = dashboardCredentials()
  if (!dashboardAuthRequired()) return { ok: true }

  if (!credentials) {
    return {
      ok: false,
      status: 503,
      message: 'Dashboard auth is not configured.',
    }
  }

  const parsed = authorization ? decodeBasicAuth(authorization) : null
  const valid =
    parsed &&
    safeEqual(parsed.username, credentials.username) &&
    safeEqual(parsed.password, credentials.password)

  if (valid) return { ok: true }

  return {
    ok: false,
    status: 401,
    message: 'Unauthorized',
    wwwAuthenticate: 'Basic realm="InstaSetter Dashboard"',
  }
}
