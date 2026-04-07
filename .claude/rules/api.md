---
paths:
  - 'src/app/api/**/*.ts'
---

# API Route Conventions

- Validate request body with Zod — never trust raw input.
- Return proper HTTP status codes (200, 400, 401, 404, 500).
- Never leak internal error details to the client.
- Webhook routes (`api/webhooks/*`) must be excluded from auth middleware.
- Webhook routes use `request.text()` for raw body — never `.json()` before signature verification.
- Inro API integration: all Inro calls go through `@/lib/services/inro-service.ts`.
- Rate limit external-facing endpoints.
