# QA Review: P2.03 — Durable email-attachment asset storage

The new code is server-only and additive. Visual QA happens in the Email Capture inspector after the bucket is provisioned (manual step).

---

## Manual QA pre-requisites (one-time)

The user must provision the private Supabase Storage bucket before the upload UX works in any environment. See `## Third-party prerequisites` in the spec. Quick path:

1. Supabase dashboard → Storage → New bucket
2. Name: `email-assets` · Public: OFF
3. Allowed MIME types: `application/pdf,image/png,image/jpeg,application/zip`
4. Max file size: `20MB`

Or run this SQL (preferred, idempotent):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-assets',
  'email-assets',
  false,
  20971520,
  array['application/pdf','image/png','image/jpeg','application/zip']
)
on conflict (id) do nothing;

drop policy if exists "Service role manage email-assets bucket" on storage.objects;

create policy "Service role manage email-assets bucket"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'email-assets')
  with check (bucket_id = 'email-assets');
```

A copy of this SQL ships in `supabase/migrations/_manual/20260502_email_assets_bucket.sql` (manual — not auto-run by `db push`).

---

## Test cases

### 1. Schema validation accepts both attachment shapes

| Step                                                                       | Expected                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Run `npx vitest run src/lib/prompts/__tests__/post-email-behavior.test.ts` | All tests green; new "stored-asset" cases pass alongside legacy URL cases. |

### 2. compile-block contract still byte-equal for default config

| Step                                                                                        | Expected                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Run `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` | All tests green; default no-overrides path still byte-equal to `buildSystemPrompt`; new fixture proves `kind: 'asset'` resolves to a Supabase signed URL via the mocked `resolveStoredAssetUrl`. |

### 3. Email-assets service unit tests cover happy + sad paths

| Step                                                                 | Expected                                                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Run `npx vitest run src/lib/services/__tests__/email-assets.test.ts` | Tests pass: upload-happy, oversize-reject, content-type-mismatch-reject, sanitization, archive flips `archived_at`, signed-URL TTL. |

### 4. Upload UI renders + interacts (server upload via mocked Server Action)

| Step                                                                                                                            | Expected                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Run `npx vitest run src/app/dashboard/flows/\[flowId\]/directions/b-stage/block-panels/__tests__/email-asset-uploader.test.tsx` | Tests pass: file drop triggers upload, success state shows file name + Remove, "Use external URL instead" toggle reveals legacy URL fields. |

### 5. End-to-end smoke (after bucket provisioned)

| Step                                                                  | Expected                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Visit `/dashboard/flows/ig-organic-dm`, open Email Capture inspector. | The new uploader is visible at the bottom of the "Email to send" panel.                           |
| Drop a 5 MB PDF.                                                      | Spinner shows, then the file name + size + "Remove" button.                                       |
| Refresh the page.                                                     | The asset reference is persisted to the draft and rehydrates on load.                             |
| Click "Remove".                                                       | Asset row gets `archived_at = now()`; UI clears the attachment block; storage object is retained. |
| Toggle "Use external URL instead".                                    | Legacy URL + filename inputs reappear; supplying values configures the legacy attachment shape.   |

### 6. Edge cases

- 25 MB PDF -> upload rejected with "File too large (max 20 MB)".
- A `.exe` renamed `.pdf` (header check fails) -> upload rejected with "File type does not match contents".
- Empty filename / filename with spaces -> normalized to `[A-Za-z0-9._-]`. Empty after sanitization -> reject.
- Non-allowed content-type (e.g. `image/gif`) -> reject before storage call.
- Storage SDK returns error -> Server Action returns `{ success: false, error }` and logs structured row.

### 7. Preserved behaviors

- compile-block contract `buildSystemPrompt() === compileBlock({ no overrides })` byte-equal: unchanged.
- Existing legacy URL drafts continue to load and render in the simulator (new union accepts the legacy shape).
- Engine path (`buildSystemPrompt`) unaffected — engine never used `compileBlock`.
- No new env vars; uses existing `SUPABASE_SERVICE_ROLE_KEY`.
