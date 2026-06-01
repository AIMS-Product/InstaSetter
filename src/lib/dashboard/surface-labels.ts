/**
 * Code-driven catalog of dashboard surface scope labels.
 *
 * Every distinct surface under `/dashboard/*` declares whether it is `LIVE`,
 * `READ_ONLY`, `COMING_SOON`, or `UNDER_CONSTRUCTION`. Page components import
 * the entry by key and render a `<SurfaceBadge>` from the catalog so operators
 * (Sofia, Jeffrey, Cody) can tell at a glance what is usable now versus still
 * being wired up.
 *
 * Server-safe: pure TypeScript, no React imports. Adopting a label change is a
 * code change — not an admin-UI toggle. We re-evaluate once Sofia has used the
 * labels in anger.
 */

export const SURFACE_LABEL_STATES = [
  'LIVE',
  'READ_ONLY',
  'COMING_SOON',
  'UNDER_CONSTRUCTION',
] as const

export type SurfaceLabelState = (typeof SURFACE_LABEL_STATES)[number]

export interface SurfaceLabel {
  /** Stable key referenced from page components. */
  readonly key: string
  /** Human-readable display label, e.g. 'Read-only'. */
  readonly display: string
  /** State drives the tone. */
  readonly state: SurfaceLabelState
  /** One-sentence operator-facing detail. Plain English, no jargon. */
  readonly detail: string
  /**
   * Routes this label applies to. The route-coverage test asserts each
   * `/dashboard/**\/page.tsx` resolves to at least one catalog entry via this
   * list. Subtab-only surfaces (e.g. flow builder Bot/Variables/Versions) may
   * point at the parent flow route since they share a URL.
   */
  readonly routes: readonly string[]
}

const CATALOG = {
  'dashboard.home': {
    key: 'dashboard.home',
    display: 'Under construction',
    state: 'UNDER_CONSTRUCTION',
    detail:
      'Active and today counts are real. Close-sync KPIs and longer-range trends are still being wired up.',
    routes: ['/dashboard'],
  },
  'dashboard.conversations.list': {
    key: 'dashboard.conversations.list',
    display: 'Read-only',
    state: 'READ_ONLY',
    detail:
      'You can search, filter, and inspect every real conversation here. Editing replies and statuses lands later.',
    routes: ['/dashboard/conversations'],
  },
  'dashboard.conversations.detail': {
    key: 'dashboard.conversations.detail',
    display: 'Read-only',
    state: 'READ_ONLY',
    detail:
      'The full transcript and tool calls are real. Sending replies or editing the timeline from here lands later.',
    routes: ['/dashboard/conversations/[id]'],
  },
  'dashboard.marketing-sources': {
    key: 'dashboard.marketing-sources',
    display: 'Live',
    state: 'LIVE',
    detail:
      'Creating, archiving, and copying SendPulse setup values all run against production data.',
    routes: ['/dashboard/marketing-sources'],
  },
  'dashboard.reports.creatives': {
    key: 'dashboard.reports.creatives',
    display: 'Read-only',
    state: 'READ_ONLY',
    detail:
      'Creative funnel rows are calculated from production conversation data. Editing source attribution from this report lands later.',
    routes: ['/dashboard/reports/creatives'],
  },
  'dashboard.flows.index': {
    key: 'dashboard.flows.index',
    display: 'Read-only',
    state: 'READ_ONLY',
    detail:
      'The flows list shows what is configured today. We support a single flow right now; click through to inspect it.',
    routes: ['/dashboard/flows'],
  },
  'dashboard.flows.detail': {
    key: 'dashboard.flows.detail',
    display: 'Read-only',
    state: 'READ_ONLY',
    detail:
      'Drafts persist, but live Instagram DMs still use the production prompt. The publish path lands later.',
    routes: ['/dashboard/flows/[flowId]'],
  },
  'dashboard.flows.detail.bot': {
    key: 'dashboard.flows.detail.bot',
    display: 'Read-only',
    state: 'READ_ONLY',
    detail:
      'Persona and guardrails read from the active prompt. Editing them in this tab lands later.',
    routes: ['/dashboard/flows/[flowId]'],
  },
  'dashboard.flows.detail.variables': {
    key: 'dashboard.flows.detail.variables',
    display: 'Reference only',
    state: 'READ_ONLY',
    detail:
      'Saved values and where the bot learns them. Editing variables from here lands later.',
    routes: ['/dashboard/flows/[flowId]'],
  },
} as const satisfies Record<string, SurfaceLabel>

export const SURFACE_LABELS: Record<string, SurfaceLabel> = CATALOG

export const SURFACE_LABEL_KEYS = Object.keys(CATALOG) as readonly string[]

export type SurfaceLabelKey = keyof typeof CATALOG

/**
 * Resolve a catalog entry by key. Throws when the key is unknown so callers
 * cannot silently render an empty badge (badges should always carry meaning).
 */
export function getSurfaceLabel(key: string): SurfaceLabel {
  const entry = SURFACE_LABELS[key]
  if (!entry) {
    throw new Error(`Unknown surface label key: ${key}`)
  }
  return entry
}
