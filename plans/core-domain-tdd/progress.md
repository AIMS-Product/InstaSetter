# TDD Plan: Core Domain Foundation — Progress

## Execution Plan

Wave 1 (parallel): Issue 1, 2, 3, 4, 5, 6, 7, 22
Wave 2a (parallel): Issue 8, 9, 11, 13, 15, 16
Wave 2b (parallel): Issue 10, 12, 14, 17, 21
Wave 3a: Issue 19
Wave 3b (parallel): Issue 18, 20

## Status

| #   | Target                                         | Status  | RED | GREEN | REFACTOR | Commit | Agent |
| --- | ---------------------------------------------- | ------- | --- | ----- | -------- | ------ | ----- |
| 1   | Test infrastructure setup                      | PENDING | -   | -     | -        | -      | -     |
| 2   | Database migration — core domain tables        | PENDING | -   | -     | -        | -      | -     |
| 3   | Domain enums and constants                     | PENDING | -   | -     | -        | -      | -     |
| 4   | Inro webhook payload Zod schema                | PENDING | -   | -     | -        | -      | -     |
| 5   | Lead summary Zod schema                        | PENDING | -   | -     | -        | -      | -     |
| 6   | Message dedup hash utility                     | PENDING | -   | -     | -        | -      | -     |
| 7   | Config expansion + service role client         | PENDING | -   | -     | -        | -      | -     |
| 8   | Contact service — upsert from webhook          | PENDING | -   | -     | -        | -      | -     |
| 9   | Conversation service — find or create active   | PENDING | -   | -     | -        | -      | -     |
| 10  | Conversation service — load prior summaries    | PENDING | -   | -     | -        | -      | -     |
| 11  | Message service — store with dedup check       | PENDING | -   | -     | -        | -      | -     |
| 12  | Message service — build Claude messages array  | PENDING | -   | -     | -        | -      | -     |
| 13  | Lead service — determine qualification         | PENDING | -   | -     | -        | -      | -     |
| 14  | Lead service — create from summary             | PENDING | -   | -     | -        | -      | -     |
| 15  | System prompt v1 builder                       | PENDING | -   | -     | -        | -      | -     |
| 16  | Claude service — build API request             | PENDING | -   | -     | -        | -      | -     |
| 17  | Claude service — parse response                | PENDING | -   | -     | -        | -      | -     |
| 18  | Webhook handler — validate and guard           | PENDING | -   | -     | -        | -      | -     |
| 19  | Conversation engine — process message pipeline | PENDING | -   | -     | -        | -      | -     |
| 20  | Conversation engine — route lead events        | PENDING | -   | -     | -        | -      | -     |
| 21  | Close conversation service                     | PENDING | -   | -     | -        | -      | -     |
| 22  | Middleware webhook exclusion                   | PENDING | -   | -     | -        | -      | -     |
