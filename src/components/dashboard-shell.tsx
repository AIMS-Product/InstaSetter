'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Megaphone,
  MessageCircle,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
  matchPrefix?: string
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  {
    href: '/dashboard/conversations',
    label: 'Conversations',
    Icon: MessageCircle,
    matchPrefix: '/dashboard/conversations',
  },
  {
    href: '/dashboard/marketing-sources',
    label: 'Sources',
    Icon: Megaphone,
    matchPrefix: '/dashboard/marketing-sources',
  },
  {
    href: '/dashboard/flows/ig-organic-dm',
    label: 'Flow Builder',
    Icon: Workflow,
    matchPrefix: '/dashboard/flows',
  },
]

interface Crumb {
  href?: string
  label: string
}

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === '/dashboard') return [{ label: 'Dashboard' }]
  if (pathname === '/dashboard/conversations') {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { label: 'Conversations' },
    ]
  }
  if (pathname.startsWith('/dashboard/conversations/')) {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/conversations', label: 'Conversations' },
      { label: 'Detail' },
    ]
  }
  if (pathname === '/dashboard/marketing-sources') {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { label: 'Marketing Sources' },
    ]
  }
  if (pathname.startsWith('/dashboard/flows/')) {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { label: 'Flow Builder' },
    ]
  }
  return [{ label: 'Dashboard' }]
}

export function DashboardShell({
  brand,
  env,
  children,
}: {
  brand: string
  env: 'development' | 'production' | 'preview'
  children: ReactNode
}) {
  const pathname = usePathname() ?? '/dashboard'
  const crumbs = buildCrumbs(pathname)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header
        aria-label="Application header"
        className="flex h-12 flex-shrink-0 items-center gap-4 border-b border-[#E5E6EC] bg-white px-4"
      >
        <Link
          href="/"
          aria-label="InstaSetter home"
          className="flex items-center gap-2 text-sm font-semibold text-[#161528] hover:opacity-80"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md text-xs font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #4F46BA, #7B6FE6)',
            }}
          >
            i
          </span>
          InstaSetter
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = item.matchPrefix
              ? pathname.startsWith(item.matchPrefix)
              : pathname === item.href
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#ECEBF7] text-[#2E297A]'
                    : 'text-[#4B4A5E] hover:bg-[#EFEFF3]'
                }`}
              >
                <Icon aria-hidden size={14} strokeWidth={1.75} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        <span
          className="rounded-full bg-[#EEEFF3] px-2 py-0.5 text-[11px] font-medium text-[#4B4A5E]"
          aria-label={`Workspace ${brand}`}
        >
          {brand}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            env === 'production'
              ? 'bg-[#E6F4EA] text-[#1F6B3A]'
              : 'bg-[#FBE7D9] text-[#8B4316]'
          }`}
          aria-label={`Environment ${env}`}
        >
          {env === 'production'
            ? 'Prod'
            : env === 'preview'
              ? 'Preview'
              : 'Dev'}
        </span>
      </header>

      <nav
        aria-label="Breadcrumb"
        className="flex h-9 flex-shrink-0 items-center gap-1.5 border-b border-[#EFEFF3] bg-[#FAFAFB] px-4 text-[12px]"
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-[#8A8A9B]">
                ›
              </span>
            )}
            {c.href ? (
              <Link
                href={c.href}
                className="text-[#6B6A7E] hover:text-[#161528]"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-[#161528]" aria-current="page">
                {c.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
