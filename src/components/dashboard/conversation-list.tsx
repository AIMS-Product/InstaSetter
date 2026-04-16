import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { RelativeTime } from '@/components/dashboard/relative-time'
import { EmptyState } from '@/components/dashboard/empty-state'
import type { ConversationListItem } from '@/types/dashboard'

export function ConversationList({
  conversations,
}: {
  conversations: ConversationListItem[]
}) {
  if (conversations.length === 0) {
    return <EmptyState title="No conversations found" />
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground">
              Contact
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              Messages
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Started
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Last Activity
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((c) => (
            <TableRow key={c.id} className="hover:bg-muted/50">
              <TableCell>
                <Link
                  href={`/dashboard/conversations/${c.id}`}
                  className="text-[13px] font-medium text-foreground hover:text-primary transition-colors"
                >
                  @{c.instagramHandle}
                </Link>
                {c.contactName && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.contactName}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} variant="conversation" />
              </TableCell>
              <TableCell className="text-right font-mono text-[13px] text-foreground/70">
                {c.messageCount}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                <RelativeTime date={c.startedAt} />
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                <RelativeTime date={c.lastMessageAt} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
