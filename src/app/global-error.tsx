'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <h1 className="text-4xl font-bold">Something went wrong</h1>
          <button
            onClick={reset}
            className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
