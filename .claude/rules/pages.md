---
paths:
  - 'src/app/**/*.tsx'
  - 'src/app/**/*.ts'
---

# Page & Route Conventions

- Pages are thin — delegate to components and services.
- Use `generateMetadata()` for SEO — never hardcode `<head>`.
- Required at app root: `not-found.tsx`, `global-error.tsx`, `loading.tsx`, `error.tsx`.
- Route groups `(group)/` for layout organization without affecting URLs.
- `Suspense` boundaries for streaming slow data.
- Middleware handles auth and redirects — never inside page components.
- All mutations via Server Actions — not client `fetch` to API routes.
