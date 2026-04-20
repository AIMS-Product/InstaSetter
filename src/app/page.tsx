import Link from 'next/link'

export default function Home() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center p-24"
    >
      <h1 className="text-4xl font-bold">InstaSetter</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        Instagram DM appointment setting automation
      </p>
      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        <Link
          href="/dashboard/conversations"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Conversations →
        </Link>
        <Link
          href="/dashboard/flows/ig-organic-dm"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Flow Builder →
        </Link>
      </div>
    </main>
  )
}
