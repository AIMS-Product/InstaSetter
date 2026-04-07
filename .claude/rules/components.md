---
paths:
  - 'src/components/**/*.tsx'
---

# Component Conventions

- Single responsibility: one component does one thing.
- Props interface at top of file, explicitly typed.
- No prop drilling past 2 levels — use Context or composition.
- Separate logic (custom hooks) from presentation (components).
- Server Components by default. Only `"use client"` when using browser APIs, state, or events.
- Push `"use client"` as low in the tree as possible.
- Use `next/image` (never `<img>`), `next/link` (never `<a href>` for internal routes).
- Tailwind CSS for styling — no CSS modules or inline styles.
