import Link from 'next/link'

export default function DashboardHome() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">InstaSetter</h1>
        <p className="mt-2 text-sm text-muted-strong">
          Flow Builder preview. Open the prototype flow to see the split-view
          editor.
        </p>
        <Link
          href="/dashboard/flows/ig-organic-dm"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Open Instagram DM Flow →
        </Link>
      </div>
    </main>
  )
}
