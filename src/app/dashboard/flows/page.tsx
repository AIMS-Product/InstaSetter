import Link from 'next/link'
import { SurfaceBadge } from '@/components/ui/surface-badge'
import { getSurfaceLabel } from '@/lib/dashboard/surface-labels'
import { KNOWN_FLOWS, resolveFlowBrand } from './[flowId]/flow-config'

export default function FlowsIndexPage() {
  const brand = resolveFlowBrand(process.env.BRAND_NAME)
  const surface = getSurfaceLabel('dashboard.flows.index')

  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex-1 overflow-auto bg-[#FAFAFB] px-6 py-8 sm:px-10"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="m-0 text-[32px] font-normal tracking-tight text-[#161528]"
              style={{
                fontFamily:
                  'var(--font-instrument-serif), ui-serif, Georgia, serif',
              }}
            >
              Flows
            </h1>
            <p className="mt-1 text-[13px] text-[#6B6A7E]">
              Conversation flows configured for {brand}.
            </p>
          </div>
          <SurfaceBadge
            state={surface.state}
            display={surface.display}
            detail={surface.detail}
          />
        </header>

        <section aria-label="Configured flows">
          <ul className="divide-y divide-[#EFEFF3] rounded-xl border border-[#EEEFF3] bg-white">
            {KNOWN_FLOWS.map((flow) => (
              <li key={flow.id}>
                <Link
                  href={`/dashboard/flows/${flow.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB]"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#ECEBF7] text-sm font-semibold text-[#2E297A]"
                  >
                    i
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#161528]">
                      {flow.name}
                    </span>
                    <span className="mt-1 block text-[12.5px] text-[#6B6A7E]">
                      {flow.channel} · {flow.description}
                    </span>
                  </span>
                  <span className="rounded-full bg-[#E6EFE1] px-2.5 py-1 text-[11px] font-medium text-[#3A5A32]">
                    Active
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
