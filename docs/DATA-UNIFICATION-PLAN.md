# BotUang Data Unification Plan

Date: 2026-10-06

Target Supabase project: `xauwlfhlrtwblstgptyk`

## Objective

BotUang will have one logical source of truth:

```text
Dashboard -> Supabase <- WhatsApp runtime
```

The VPS SQLite database may remain temporarily as a rollback snapshot and short-lived compatibility cache. It must not remain an independent writer after cutover.

This document is a prerequisite for production backup or mutation. No production data was changed while preparing it.

## Observed Production State

Three stores currently exist:

1. Dashboard Supabase: `xauwlfhlrtwblstgptyk`.
2. Legacy Bot Supabase: `bxsqszakzwjnfxxmjmxl`, configured on the VPS but empty for all audited BotUang tables.
3. VPS SQLite: `/root/BotUang/db/finance.sqlite`, currently authoritative for WhatsApp Reminder, Command, rental, token, and PIN behavior.

The configured VPS `DATABASE_CLIENT` is `supabase`, but the implementation still reads nearly all entities from SQLite. Only transaction and rental helper functions attempt asynchronous dual writes, and those writes target the empty legacy Supabase project.

### Inventory Summary

| Entity | Target Supabase | VPS SQLite | Legacy Supabase |
|---|---:|---:|---:|
| Transactions | 2 active, 2 soft-deleted | 0 | 0 |
| Participants | 0 | 0 | 0 |
| Todos | 0 active, 7 soft-deleted | 0 active, 3 soft-deleted | 0 |
| Reminders | 0 | 2 active across two groups, 5 soft-deleted | 0 |
| Custom commands | 0 active, 3 soft-deleted | 3 active, 1 soft-deleted | 0 |
| Group settings | 0 | 0 | 0 |
| Group rentals | 0 | 5 | 0 |
| Rental requests | 2 | 0 | 0 |
| Dashboard tokens | 0 | 5 | 0 |

The target group's active VPS state is:

- Group ID: `120363427301916965@g.us`
- WhatsApp name: `Manage Keuangan Radit`
- Rental: active through `2029-06-18T23:59:00+07:00`
- Reminder: 1 active
- Custom commands: 3 active

## Global Authority Rules

| Domain | Authority during bootstrap | Authority after cutover |
|---|---|---|
| Authentication and account/group authorization | Target Supabase | Target Supabase |
| WhatsApp group display name | Live WhatsApp metadata | Live WhatsApp metadata persisted to target Supabase |
| Transactions | Target Supabase existing rows plus reviewed import | Target Supabase |
| Participants | Target Supabase plus reviewed import | Target Supabase |
| Todos | Target Supabase plus reviewed import | Target Supabase |
| Reminders | Active VPS SQLite records imported once | Target Supabase |
| Custom commands | Active VPS SQLite records imported once | Target Supabase |
| Group settings | Most recent non-null field per group | Target Supabase |
| Rental | Preserve longest valid active production rental | Target Supabase |
| Rental requests | Target Supabase | Target Supabase |
| Dashboard token/PIN authorization | Existing valid VPS credentials during bootstrap | Target Supabase |

No merge rule may undelete a target Supabase row merely because a stale SQLite row is active. Imports require a deterministic source identity.

## Identity and Idempotency

SQLite entity IDs are integers. Supabase entity IDs are UUIDs. Reusing SQLite IDs as Supabase IDs is not possible.

The final migration adds a server-only `bot_data_mappings` provenance table
instead of altering every business table. It maps entity, source system, source
record ID, target UUID, and group ID under a repeatable unique constraint. The
importer will use `source_system = 'vps-sqlite'` and the SQLite integer ID as
`source_record_id`. RLS is enabled with no authenticated-user policies, so only
trusted service-role migration code can access this mapping.

Natural keys are used where they are safe:

- Group tables: `group_id`.
- Custom commands: normalized `(group_id, lower(keyword))` among active records.
- Dashboard tokens: `token`.

Records without a reliable natural key use provenance mapping. No fuzzy text matching is allowed for financial records.

## Entity Plans

### Transactions

**Supabase schema:** UUID ID, group ID, income/expense type, numeric amount, nullable note/sender fields, created/edited/deleted timestamps.

**VPS schema:** integer ID, integer amount, non-null note and sender ID, equivalent timestamps.

**Canonical source:** target Supabase.

**Differences:** incompatible IDs and SQLite non-null constraints. Target Supabase contains two active records not present in SQLite; these must be reviewed, not deleted automatically.

**Migration direction:** import any real SQLite rows into target Supabase using provenance. Current SQLite has zero rows, so no transaction import is presently required.

**Conflict strategy:** existing Supabase UUID records remain untouched. A provenance collision skips the import. Never merge by amount/note/date.

**Rollback:** retain pre-cutover SQLite backup and target Supabase export. Runtime can temporarily switch to the frozen SQLite backup only before new canonical writes begin.

### Participants

**Supabase schema:** UUID ID and JSONB `data`.

**VPS schema:** integer ID and JSON string `data`.

**Canonical source:** target Supabase.

**Migration direction:** parse valid SQLite JSON and import with provenance. Invalid JSON is quarantined in the migration report rather than coerced.

**Conflict strategy:** provenance wins. Names are not unique and must not be used as an identity.

**Rollback:** restore exported Supabase rows and retain SQLite backup.

### Todos

**Supabase schema:** UUID ID and boolean `is_done`.

**VPS schema:** integer ID and integer `is_done`.

**Canonical source:** target Supabase.

**Differences:** all observed rows in both stores are already soft-deleted.

**Migration direction:** import active VPS records only by default. Deleted history is exported but not imported unless specifically approved.

**Conflict strategy:** provenance mapping; deletion wins over an older active version from the same source ID.

**Rollback:** restore exported rows and runtime configuration.

### Reminders

**Supabase schema:** UUID ID, type/value/text, creator, created/deleted timestamps.

**VPS schema:** integer ID with equivalent fields. Dispatch deduplication is stored separately in SQLite `reminder_dispatch`.

**Canonical source:** target Supabase after bootstrap.

**Migration direction:** import active VPS reminders with provenance. Bot scheduler must then query target Supabase and use a Supabase-backed dispatch log before SQLite writes are disabled.

**Conflict strategy:** source ID provenance; a Supabase soft deletion wins. Do not infer identity from reminder text or schedule.

**Rollback:** preserve both `reminders` and `reminder_dispatch` in the encrypted/raw VPS backup. During transitional rollout, scheduler can fall back to SQLite only under an explicit feature flag.

### Custom Commands

**Supabase schema:** UUID ID, keyword/response, media path/type/caption, created/deleted timestamps. The current target schema has no `updated_at` column.

**VPS schema:** integer ID, equivalent fields plus `media_url` and `updated_at` in the live database.

**Canonical source:** target Supabase after bootstrap.

**Migration direction:** import active VPS commands. Copy media only after checking that each referenced file exists; store a durable target path, not an absolute VPS path.

**Conflict strategy:** live WhatsApp/VPS command wins only during initial bootstrap when target has no active command with the same normalized keyword. After cutover, Supabase wins. Add an active-keyword uniqueness constraint after conflict review.

**Rollback:** retain SQLite and media directory backups; exported Supabase commands can restore canonical state.

### Group Settings

**Supabase schema:** group ID, header/weather/typo fields, service toggles, locations, spreadsheet URL. The deployed schema does not yet include the newer prayer service columns from the pending migration.

**VPS schema:** group ID, participant header, weather location, typo flag, update timestamp.

**Canonical source:** target Supabase.

**Migration direction:** field-level merge. Newer non-null VPS values may seed empty Supabase fields; Supabase-only fields are never removed.

**Conflict strategy:** compare `updated_at`; preserve non-null Supabase service configuration when timestamps are unavailable.

**Rollback:** export settings before merge and upsert the export to restore.

### Group Rentals

**Supabase schema:** group ID, active state, start/expiry timestamps, updater, updated timestamp, PIN, and group name.

**VPS schema:** equivalent fields plus warning timestamps.

**Canonical source:** preserve VPS production rental during bootstrap; target Supabase after cutover.

**Migration direction:** bootstrap all VPS rental rows. For the target group, preserve the active expiry on 2029-06-18. Persist current WhatsApp metadata name.

**Conflict strategy:** never shorten an active rental. If both stores have valid future expiry values, choose the later expiry and record the decision. Live WhatsApp metadata wins for `group_name`. Authorization/PIN does not come from WhatsApp metadata.

**Rollback:** restore the Supabase export. SQLite remains unchanged until post-cutover verification, so its original rental can be restored.

### Rental Requests

**Supabase schema:** UUID ID, group ID, months, status, proof, created/updated timestamps.

**VPS schema:** integer ID and equivalent fields.

**Canonical source:** target Supabase.

**Migration direction:** no VPS rows currently require import. Keep the two target Supabase requests unchanged.

**Conflict strategy:** UUID target records win. Future Bot runtime requests must be created in Supabase and refer to the Supabase UUID.

**Rollback:** restore the Supabase export; no SQLite deletion is required.

### Dashboard Tokens

**Supabase schema:** token primary key, group ID, created/expiry timestamps, PIN verification flag.

**VPS schema:** equivalent fields.

**Canonical source:** target Supabase after bootstrap.

**Migration direction:** import only unexpired or already verified tokens needed for compatibility. Do not extend expiration during import.

**Conflict strategy:** token primary key is authoritative. Existing Supabase token wins unless the VPS token has a later legitimate expiry for the same group.

**Rollback:** keep SQLite token records and Supabase export. Revoking a migrated token requires explicit action, not rollback side effects.

## Group Bootstrap

Bootstrap is an owner-only, dry-run-first operation:

1. Read VPS group/rental metadata through an authenticated server-to-server endpoint.
2. Compare it with target Supabase by `group_id`.
3. Produce a plan containing `insert`, `update`, `skip`, and `conflict` decisions.
4. Require an explicit apply action.
5. Upsert only reviewed fields.
6. Update matching `user_group_access.group_name` after `group_rentals` succeeds.

The operation must not auto-deactivate groups, shorten rentals, replace PINs with null, or overwrite a newer Supabase timestamp.

## Runtime Cutover

The runtime change must be staged:

1. **Read shadow:** Bot continues SQLite reads and compares Supabase counts/identities in logs.
2. **Supabase reads:** Bot reads canonical entities from target Supabase; SQLite remains fallback behind an explicit flag.
3. **Supabase writes:** Bot writes canonical entities to Supabase. No silent dual write.
4. **Disable fallback writes:** SQLite becomes read-only rollback storage.
5. **Remove fallback:** only after production verification and a retention window.

The Bot must use a server-only key. Dashboard users continue using RLS-bound JWTs.

## Sync Health Check

Add an owner-only endpoint that returns sanitized comparisons:

- group presence
- group-name equality
- rental active/expiry equality
- active record counts for commands and reminders
- latest synchronization timestamps
- status values: `synced`, `different`, `missing_supabase`, `missing_bot`, `unavailable`

It must never return PINs, dashboard tokens, proof images, API keys, or raw user financial records.

## RLS Requirements

For every user-writable group table, policies must require:

```sql
exists (
  select 1
  from public.user_group_access access
  where access.user_id = auth.uid()
    and access.group_id = target_table.group_id
)
```

`UPDATE` must use the predicate in both `USING` and `WITH CHECK`. Soft deletion is an update and uses the same rule. No production policy may use `USING (true)`.

Service-role operations are limited to authenticated server routes that independently verify owner or group access.

## Backup and Rollback Prerequisites

Before any import or environment cutover:

1. Stop or checkpoint writes long enough to copy SQLite consistently, including WAL/SHM when present.
2. Create a timestamped VPS archive outside the Git repository.
3. Export all relevant target Supabase tables to a protected local backup directory outside the Git repository.
4. Record SHA-256 hashes and row counts.
5. Verify the SQLite copy opens read-only and passes `PRAGMA integrity_check`.
6. Never commit backup data, auth files, media, PINs, tokens, or proofs.

Rollback restores configuration first, then data only from verified backups. It must not delete unmatched canonical records.

### Completed Phase J Backups

VPS backup:

- Location: `/root/botuang-production-backups/phase-j-2026-10-06T11-54-04-927Z`
- Database copy method: `better-sqlite3` online backup API.
- Database integrity: `ok` from `PRAGMA integrity_check`.
- Database SHA-256: `3b06dbcfaebf510f19a646595863aac4e315ce5f985f9a6cd711b5af0166f4e4`.
- Command media archive SHA-256: `87e7d21fcfdeea5475d63f9e90375da761e439105ec5253be7057418022304c5`.
- Permissions: directory `0700`; database, manifest, and media archive `0600`.

Target Supabase export:

- Location: `C:\tmp\botuang-phase-j-supabase-2026-10-06T11-55-31-432Z`.
- Tables: all nine migration entities plus `user_group_access` and `user_profiles`.
- Verification: every JSON file count and SHA-256 matched its manifest.
- ACL: current user, SYSTEM, and Administrators only.

Neither backup location is inside the Git repository.

## Migration Stop Gate

Production migration requires one of:

- Supabase CLI account access with migration privileges for `xauwlfhlrtwblstgptyk` plus `SUPABASE_DB_PASSWORD`, or
- manual execution by a project owner in the Supabase SQL Editor.

The current CLI session returns HTTP 403 and no database password is available. Therefore schema migrations and production imports must stop at this gate until access is supplied.

## Secrets

Rotation is required for every credential previously shared or embedded, including VPS password, Bot API token, Supabase secret keys, and AI key. Replacement secrets must be installed only in Vercel/VPS environment configuration.

The Bot runtime source currently contains a hardcoded fallback Supabase secret. It must be removed before runtime code is committed or redeployed.

The local runtime fallback has now been removed from `BotUang/config.js`. The
replacement `SUPABASE_KEY` and `CLAIM_OWNER_CODE` must be provided only through
the VPS environment before a later runtime deployment.

## Prepared Cutover Controls

The dashboard now supports a build-time `NEXT_PUBLIC_CANONICAL_DATA_SOURCE`
switch. It defaults to the current legacy compatibility behavior. Setting it to
`supabase` makes dashboard list reads and CRUD writes use Supabase as canonical
and suppresses legacy Bot API writes. **Do not enable it yet:** the WhatsApp
runtime scheduler and command resolver must consume target Supabase first.

Group bootstrap is dry-run-only at `/api/bot/group-bootstrap` unless the
server-only `PHASE_J_ALLOW_APPLY=true` gate is explicitly installed. That gate
must remain unset until migrations are applied and the dry-run is reviewed.

The owner-only `/api/bot/sync-health` endpoint compares sanitized group name,
rental, Reminder count, and Command count state. It never returns PINs, tokens,
proof images, credentials, or raw financial rows.
