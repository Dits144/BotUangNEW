# Phase J Production Blocker Report

Date: 2026-10-06

Stop state: **WAITING FOR SUPABASE MIGRATION**

No production rows were modified and no VPS runtime code was deployed during
Phase J. Verified backups exist before any future import.

## Status

| Area | Status | Result |
|---|---|---|
| RLS | PARTIAL | Final transaction-safe migration prepared and tested; production apply is blocked by Supabase access. |
| Transactions | PARTIAL | Canonical Supabase CRUD path is prepared; production update/delete cannot be verified before RLS migration. |
| Reminders | PARTIAL | Dashboard canonical mode is prepared; VPS scheduler still reads SQLite. |
| Commands | PARTIAL | Dashboard canonical mode and target schema additions are prepared; VPS resolver still reads SQLite. |
| Group bootstrap | PARTIAL | Owner-only dry-run/apply route exists; apply remains server-gated and was not run. |
| Group name | BLOCKED | WhatsApp metadata wins in the prepared bootstrap, but production Supabase was not mutated. |
| Rental | BLOCKED | Conflict logic preserves the longer active rental, but production Supabase was not mutated. |
| PIN/token | BLOCKED | Compatibility rules are documented; tokens/PINs were not imported before the migration gate. |
| Supabase to VPS sync | PARTIAL | Owner-only sanitized health comparison exists; canonical runtime cutover is not enabled. |
| Bot runtime | BLOCKED | Runtime still uses SQLite for scheduler/commands and must not be switched until target migration/import. |
| Backups | VERIFIED | VPS SQLite/media and target Supabase exports were hashed and stored outside Git. |
| Tests | VERIFIED | Unit 10/10, build PASS, lint 0 errors, Playwright 22 passed and 18 credential-gated skipped. |
| Secrets to rotate | BLOCKED | VPS, Bot API, Supabase, AI, and owner-claim credentials previously exposed must be rotated. |

Weather and Emergency remain UNVERIFIED and unchanged. Prayer scheduling was
not rewritten; actual WhatsApp delivery remains UNVERIFIED.

## Required Manual Migration

Use a Supabase account with Owner/Developer migration permission for project
`xauwlfhlrtwblstgptyk`. Either provide the linked CLI with that access plus the
project database password, or run these files in the Supabase SQL Editor in
order:

1. `supabase/migrations/202610060001_fix_finance_crud_update_policies.sql`
2. `supabase/migrations/202610060002_data_unification_support.sql`

Then:

1. Confirm both SQL transactions commit without error.
2. Keep `PHASE_J_ALLOW_APPLY` unset and review `GET /api/bot/group-bootstrap` as an authenticated owner.
3. Review `GET /api/bot/sync-health`; do not expose its response publicly.
4. Approve the dry-run decisions, temporarily set the server-only apply gate,
   invoke the reviewed bootstrap once, then remove the gate.
5. Import active Reminder, Command, rental, and compatible token records using
   the verified backups and provenance mapping.
6. Update the WhatsApp runtime to read target Supabase and verify shadow reads.
7. Only after runtime verification, build with
   `NEXT_PUBLIC_CANONICAL_DATA_SOURCE=supabase`.
8. Run authenticated transaction, Todo, Reminder, Command, group restoration,
   rental, owner, Bot status, WhatsApp command, and scheduler tests.

Do not enable canonical dashboard mode before the Bot runtime is consuming the
same target Supabase project.
