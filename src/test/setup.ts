import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest doesn't auto-unmount React Testing Library containers between
// tests; explicit cleanup keeps each render in its own jsdom slate so
// queries don't pick up nodes from prior cases.
afterEach(() => {
  cleanup()
})
