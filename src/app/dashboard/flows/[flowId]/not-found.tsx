import Link from 'next/link'

export default function FlowNotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex flex-1 items-center justify-center bg-[#FAFAFB] px-6 py-12"
    >
      <div className="w-full max-w-md rounded-xl border border-[#E5E6EC] bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-[#161528]">
          Flow not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6B6A7E]">
          This Flow Builder link does not match a configured flow.
        </p>
        <Link
          href="/dashboard/flows"
          className="mt-6 inline-flex min-h-10 items-center rounded-md bg-[#161528] px-4 text-sm font-medium text-white hover:bg-[#2B2940]"
        >
          View flows
        </Link>
      </div>
    </main>
  )
}
