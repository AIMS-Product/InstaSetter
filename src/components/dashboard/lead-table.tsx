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
import { LeadDetailPanel } from '@/components/dashboard/lead-detail-panel'
import type { LeadListItem } from '@/types/dashboard'
import { CheckCircle2, XCircle } from 'lucide-react'

export function LeadTable({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return <EmptyState title="No leads found" />
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
              Status
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Call
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Email
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Machines
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Created
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <>
              <TableRow key={lead.id} className="hover:bg-muted/50">
                <TableCell className="text-[13px] font-medium text-foreground">
                  @{lead.instagramHandle}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {lead.name ?? '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={lead.qualificationStatus}
                    variant="lead"
                  />
                </TableCell>
                <TableCell>
                  {lead.callBooked ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/30" />
                  )}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {lead.email ?? '-'}
                </TableCell>
                <TableCell className="font-mono text-[13px] text-foreground/70">
                  {lead.machineCount ?? '-'}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  <RelativeTime date={lead.createdAt} />
                </TableCell>
              </TableRow>
              {(lead.keyNotes ||
                lead.locationType ||
                lead.recommendedAction) && (
                <TableRow key={`${lead.id}-detail`}>
                  <TableCell colSpan={7} className="bg-muted/30 py-3">
                    <LeadDetailPanel lead={lead} />
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
