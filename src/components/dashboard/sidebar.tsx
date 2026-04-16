'use client'

import {
  LayoutDashboard,
  MessageSquare,
  Target,
  Users,
  Activity,
} from 'lucide-react'
import { SidebarNavItem } from '@/components/dashboard/sidebar-nav-item'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  {
    href: '/dashboard/conversations',
    label: 'Conversations',
    icon: MessageSquare,
  },
  { href: '/dashboard/leads', label: 'Leads', icon: Target },
  { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
] as const

export function Sidebar() {
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary/20">
          <MessageSquare className="h-3.5 w-3.5 text-sidebar-primary" />
        </div>
        <span className="text-[14px] font-bold tracking-tight text-sidebar-accent-foreground">
          InstaSetter
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-6">
        <p className="mb-2.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
          Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[10px] font-medium tracking-wide text-sidebar-foreground/25">
          DM Automation v2
        </p>
      </div>
    </aside>
  )
}
