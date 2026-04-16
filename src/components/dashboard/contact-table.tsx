import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RelativeTime } from '@/components/dashboard/relative-time'
import { EmptyState } from '@/components/dashboard/empty-state'
import type { ContactListItem } from '@/types/dashboard'

export function ContactTable({ contacts }: { contacts: ContactListItem[] }) {
  if (contacts.length === 0) {
    return <EmptyState title="No contacts found" />
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground">
              Handle
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Email
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Source
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              Convos
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              First Seen
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Last Message
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id} className="hover:bg-muted/50">
              <TableCell className="text-[13px] font-medium text-foreground">
                @{c.instagramHandle}
                {c.optedOut && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-[10px] text-rose-600 border-rose-200 bg-rose-50"
                  >
                    opted out
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                {c.name ?? '-'}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                {c.email ?? '-'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium capitalize text-foreground/60"
                >
                  {c.source.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-[13px] text-foreground/70">
                {c.conversationCount}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                <RelativeTime date={c.firstSeenAt} />
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
