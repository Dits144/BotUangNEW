# BotUang Fix Plan

This plan follows the audit rule: fix reliability before adding features or polishing UI.

## P0 - Security / Data Loss / Authentication

1. **Unify source of truth for rental requests**
   - Problem: dashboard creates `rental_requests` in Supabase, but owner approval forwards to Bot API/SQLite by request ID.
   - Risk: owner may see a request but approval fails or approves the wrong store.
   - Status: initial code fix applied. Supabase UUID requests now resolve to `group_id` and `months`; the Bot API receives an activation action, then Supabase request status is updated.
   - Remaining: perform a safe live approval/rejection test with a non-critical rental request.

2. **Stop exposing server configuration errors to users**
   - Problem: user-facing messages can mention `SUPABASE_SERVICE_ROLE_KEY` or raw provider errors.
   - Risk: poor production UX and information leakage.
   - Fix: map server errors to user-friendly messages, keep detail in server logs.

3. **Protect production data from tests**
   - Problem: no dedicated E2E test data setup exists.
   - Risk: destructive tests could hit real financial data.
   - Fix: require `E2E_RUN_MUTATION=true`, a test group, and preferably a separate Supabase project before mutation tests run.

## P1 - Core Finance Broken / Inconsistent

1. **Resolve dashboard/Bot dual-write divergence**
   - Affected: transactions, participants, todos, reminders, commands.
   - Problem: UI often writes Bot API and Supabase separately. If one succeeds and the other fails, state diverges.
   - Fix options:
     - Make Bot API the writer and Bot syncs Supabase.
     - Or make Supabase the writer and Bot watches/polls Supabase.
     - Avoid silent dual-write success.

2. **E2E verify transaction CRUD persistence**
   - Create safe test records only.
   - Validate create -> refresh -> edit -> refresh -> delete -> refresh.

3. **E2E verify overview numbers**
   - Use controlled test records.
   - Assert balance, income, expense, transaction count, chart inputs.

## P2 - Major Feature Broken / Partial

1. **Rental extension request and approval**
   - Make proof upload, request creation, owner notification, owner approval, and group rental extension one coherent flow.
   - Store proof image signed-access strategy.
   - Update Supabase request status after approve/reject.

2. **Prayer/Azan scheduler**
   - Dashboard settings and Bot endpoint exist.
   - Missing guaranteed persistent scheduler wiring.
   - Fix: PM2 cron or bot interval calls `POST https://www.dashboardits.tech/api/prayer/run` every minute using `BOT_API_TOKEN`.
   - Verify dedupe via `prayer_reminder_logs`.

3. **AI Assistant reliability**
   - Gemini may be denied; local parser fallback is partial.
   - Show degraded state clearly.
   - Add tests for local parsing: transaction, reminder, todo, command, query.

4. **Spreadsheet integration**
   - Currently stores URL only.
   - Either label it clearly as "link reference" or implement actual export/sync.

5. **Emergency alerts**
   - Currently UI/settings only.
   - Either hide/disable until provider exists, or implement BMKG/alert backend.

6. **Weather**
   - Dashboard stores location/toggle but does not show actual weather status.
   - Bot command exists. Decide if web preview is required.

## P3 - UI / Responsive / Navigation

1. **Run Playwright visual/responsive audit**
   - Viewports: 360, 390, 430, 768, 1024, 1366, 1440.
   - Pages: login, connect, dashboard, transactions, participants, todos, reminders, commands, settings, owner.

2. **Fix lint debt**
   - Exclude legacy `BotUang/` from root Next lint or create separate lint config.
   - Fix React hook lint issues in dashboard and owner components.

3. **Remove hardcoded marketing-like sample data from product surfaces**
   - Landing preview can remain clearly illustrative.
   - Dashboard must never show fake finance records.

4. **Review mobile forms**
   - Settings Location/Services section is dense and needs 390px screenshot QA.
   - Owner Dashboard cards need long group-name checks.

## P4 - Polish

1. **Unify visual language**
   - Reduce nested cards where possible.
   - Keep radius and spacing consistent.

2. **Improve empty/error copy**
   - Avoid raw backend/provider text.
   - Provide next action: reconnect bot, configure location, install migration, etc.

3. **Add owner debug panel**
   - Show Bot API health, Supabase migration status, prayer scheduler last check, and rental request sync state.

## Execution Order

1. P0 rental request source-of-truth.
2. P1 dual-write decision for finance CRUD.
3. E2E safe test environment and mutation tests.
4. P2 scheduler/AI/spreadsheet/emergency cleanup.
5. P3 responsive/lint/navigation.
6. P4 visual polish.

## Do Not Do Yet

- Do not add more dashboard features.
- Do not add new cards/widgets.
- Do not polish emergency/spreadsheet until their backend behavior is decided.
- Do not run mutation E2E against production financial groups.
