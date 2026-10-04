# BotUang Feature Audit

Audit date: 2026-10-05  
Scope: Next.js dashboard, Supabase integration, Bot API proxy routes, and the local `BotUang/` bot API files present in this workspace.

## Verification Legend

- ✅ WORKING: verified by code path and/or a successful command/test.
- ⚠️ PARTIAL: some layers exist, but the end-to-end flow has gaps.
- ❌ BROKEN: known failure in the current implementation.
- 🚧 UI ONLY: visible in UI but no complete backend/service path.
- ❓ UNVERIFIED: requires production credentials, WhatsApp bot state, safe test group, or third-party service response.

## Evidence Collected

- `npm run build`: ✅ passed after latest changes.
- `node --check BotUang/api-routes.js`: ✅ passed before VPS deploy.
- `node --check BotUang/commands/help.js`: ✅ passed before VPS deploy.
- VPS bot endpoint test: ✅ `/api/prayer/test` returned `{"ok":true,"success":true,...}` after deploying bot route.
- `npm run lint`: ✅ exits successfully after classifying `BotUang/` as bot runtime and ignoring it from root dashboard lint. Current dashboard lint still reports 9 warnings and 0 errors.
- Browser E2E: Playwright added. Public navigation/responsive smoke test passed: 12/12. Authenticated/mutation tests require safe test env variables and were not run against production data.
- Codebase map: ✅ `docs/CODEBASE-MAP.md` classifies active dashboard code, bot runtime code, shared docs/tests, generated output, and legacy/unknown candidates.

## Feature Matrix

| Feature | UI | Database | API | Functional | Mobile | Status | Problem / Evidence |
|---|---:|---:|---:|---:|---:|---|---|
| Authentication | Yes | Supabase Auth | Supabase client | Yes | Likely | ⚠️ PARTIAL | Login/register implemented, but email verification behavior is provider-config dependent and not E2E verified. |
| Register | Yes | Supabase Auth + metadata | Supabase client | Partial | Likely | ⚠️ PARTIAL | `full_name` metadata is stored; no complete email confirmation test. |
| Email verification | Minimal | Supabase Auth | Supabase hosted email | Unknown | N/A | ❓ UNVERIFIED | Requires Supabase SMTP/Auth settings and real email test. |
| Login | Yes | Supabase Auth | Supabase client | Yes | Likely | ⚠️ PARTIAL | Code path exists; needs E2E with safe credentials. |
| Logout | Yes | Supabase session | Supabase client | Yes | Likely | ✅ WORKING | Removes local dashboard session and signs out. |
| Session persistence | Yes | LocalStorage + Supabase session | `/api/access/groups` | Partial | N/A | ⚠️ PARTIAL | Restore logic exists. Needs E2E across refresh and expired Supabase token. |
| Group Connect token | Yes | `dashboard_tokens`, `user_group_access` | `/api/access/groups` + Bot API validate | Partial | Likely | ⚠️ PARTIAL | Supports token/PIN. Depends on service role and Bot API availability. |
| PIN verification | Yes | `group_rentals.password` | `/api/access/groups` | Partial | Likely | ⚠️ PARTIAL | Works by code path; not tested with a safe non-production group. |
| Multi-group | Yes | `user_group_access`, `group_rentals` | `/api/access/groups` | Partial | Likely | ⚠️ PARTIAL | Owner fallback lists rentals. Needs E2E group switching with multiple safe groups. |
| Group switcher real name | Yes | `group_rentals.group_name` | `/api/access/groups` | Yes | Likely | ✅ WORKING | API now overlays `group_rentals.group_name`; UI shows name + group id. |
| Overview balance/income/expense | Yes | `transactions` | Supabase + Bot data fetch | Partial | Likely | ⚠️ PARTIAL | Correctly filters dashboard-generated unsynced AI records, but needs safe data verification. |
| Overview charts | Yes | `transactions` | client aggregation | Partial | Likely | ⚠️ PARTIAL | Uses real transaction array; chart empty states need visual verification. |
| Recent transactions | Yes | `transactions` | Supabase | Partial | Likely | ⚠️ PARTIAL | Real table/list exists; needs E2E filter/search/export. |
| Transaction create | Yes | `transactions` | Supabase + Bot API fallback | Partial | Likely | ⚠️ PARTIAL | Inserts to Supabase and tries Bot API. Risk: dual-write divergence if one succeeds and one fails. |
| Transaction edit | Yes | `transactions` | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | Same dual-write divergence risk; no transaction/job queue. |
| Transaction delete | Yes | `deleted_at` soft delete | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | Same dual-write risk. |
| Transaction search/filter/export | Yes | client-side | N/A | Partial | Likely | ⚠️ PARTIAL | Implemented client-side; export not E2E verified. |
| Participants CRUD | Yes | `participants` | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | UI maps dues/status into JSON `data`; Bot API note field may not round-trip status cleanly. |
| Todo CRUD | Yes | `todos` | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | CRUD exists. Previous user reported stale todo; needs E2E persistence test. |
| Reminder CRUD | Yes | `reminders` | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | UI supports date/time. Bot scheduler handles WA reminders; dashboard delete soft-deletes Supabase and Bot API if available. |
| Command CRUD | Yes | `custom_commands` | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | Text commands work; media command handling from dashboard remains limited. |
| AI parsing | Yes | none | `/api/ai/transaction-parser` | Partial | N/A | ⚠️ PARTIAL | Gemini often denied; local parser fallback exists but not full natural-language coverage. |
| AI confirmation | Yes | client state | N/A | Partial | Likely | ⚠️ PARTIAL | Confirmation UI exists. Needs E2E for transaction/todo/reminder/command save. |
| AI transaction saving | Yes | `transactions` | Supabase + Bot API | Partial | Likely | ⚠️ PARTIAL | Saves after confirmation; same dual-write risk and Gemini fallback limitations. |
| Spreadsheet integration | Yes | `group_settings.spreadsheet_url` | none | No | N/A | 🚧 UI ONLY | URL can be stored, but no Google Sheets sync/import/export implementation. |
| Weather | Yes | `group_settings.weather_location` | Bot command/API | Partial | Likely | ⚠️ PARTIAL | WA command exists; dashboard only stores location and toggle. No dashboard weather preview/status. |
| Location services | Yes | `group_settings` location fields | Browser geolocation | Partial | Likely | ⚠️ PARTIAL | Coordinates stored; reverse geocoding/location naming is manual. |
| Prayer/Azan settings | Yes | `group_settings` prayer fields | `/api/prayer/status` | Partial | Likely | ⚠️ PARTIAL | Schedule resolves via AlAdhan. Requires migration and valid coordinates. |
| Prayer scheduler | No direct UI | `prayer_reminder_logs` | `/api/prayer/run` | Partial | N/A | ⚠️ PARTIAL | Endpoint exists, but persistent cron/bot scheduler must call it every minute. |
| Test Azan | Yes | none | Dashboard server -> Bot API | Verified once | N/A | ✅ WORKING | VPS local test to `/api/prayer/test` returned ok and sent message. Dashboard button still needs browser E2E. |
| Emergency alerts | Toggle only | `emergency_*` fields | none | No | N/A | 🚧 UI ONLY | No BMKG/alert provider or scheduler. |
| Calculator | Yes | none | none | Yes | Likely | ⚠️ PARTIAL | Local calculator exists; no E2E coverage yet. |
| Rental status | Yes | `group_rentals` | Supabase | Partial | Likely | ⚠️ PARTIAL | Status display works from Supabase data; not E2E verified. |
| Extension request | Yes | `rental_requests`, storage | `/api/rental/request` + Bot notify | Partial | Likely | ⚠️ PARTIAL | Request saves and notification attempts. Approval path has ID/source mismatch risk. |
| QRIS owner | Yes | `owner_settings`, storage | image upload API | Partial | Likely | ⚠️ PARTIAL | Upload/display exists. Needs storage bucket/RLS verification in production. |
| Owner approval | Yes | Supabase rental_requests + Bot activation | `/api/bot/owner` | Fixed by code, live approval unverified | Likely | ⚠️ PARTIAL | Supabase UUID requests are now resolved to `group_id`/`months`, then Bot API activates rental and Supabase status is updated. Needs safe live test. |
| Owner groups/rentals | Yes | Bot API + Supabase fallback | `/api/bot/owner` | Partial | Likely | ⚠️ PARTIAL | Lists Bot API groups and fallback requests; consistency across SQLite/Supabase is not guaranteed. |
| Owner payments | Yes | `rental_requests` | Bot API owner routes | Partial | Likely | ⚠️ PARTIAL | Payment proof view added; approval/rejection source-of-truth is split. |
| Owner notifications | Minimal | none | Bot API notify endpoints | Partial | N/A | ⚠️ PARTIAL | Rental notification endpoint added to bot. No durable notification log/read state. |
| Owner broadcast | Yes | none | Bot API owner broadcast | Unverified | N/A | ❓ UNVERIFIED | Requires real Bot API + safe broadcast target. |
| Owner server status | Yes | none | Bot API `/owner/health` | Unverified | N/A | ❓ UNVERIFIED | Depends on VPS bot endpoint. |
| Owner backup | Help lists command | bot script exists | WhatsApp owner command | Unverified | N/A | ❓ UNVERIFIED | Web owner backup action is not implemented. |
| Bot status | Yes | none | `/api/bot/status` | Partial | N/A | ⚠️ PARTIAL | Handles unreachable/config states. Needs dashboard E2E against deployed VPS. |

## Suspicious / Fake / Hardcoded Implementations

- `app/components/landing-page.tsx` shows sample finance numbers and transaction names. This is acceptable only as marketing preview, not product data.
- `BotUang/api-routes.js` still contains fallback labels such as `Grup Keuangan`.
- `BotUang/api-routes.js` uses fallback rental notification group `120363427301916965@g.us`; should be env-only.
- `app/api/ai/transaction-parser/route.ts` uses local parser fallback when Gemini fails. This is intentional but should be visible as degraded AI mode.
- `Spreadsheet integration` currently stores a URL only.
- `Emergency alerts` currently stores fields only.
- `BotUang/` contains legacy TypeScript stock-store code unrelated to BotUang finance dashboard; it pollutes lint/search output.

## Navigation Audit

- Fixed: `app/components/landing-page.tsx` internal `<a href>` links were changed to `next/link`.
- Remaining acceptable browser APIs:
  - `window.location.search` and `window.location.pathname` in connect/login redirect handling.
  - `window.open` for proof image external signed URL.
- Dashboard nav uses `Link` and App Router route pages return `null` under persistent layout, so sidebar/header remain mounted.

## Responsive / Visual Audit

Verified by code inspection:
- Desktop transaction table switches to mobile list.
- Main dashboard has mobile bottom navigation and desktop sidebar.
- Forms use sheets, generally mobile-friendly.

Not fully verified:
- Screenshots at 360/390/430/768/1024/1366/1440 were not completed yet. Playwright public responsive tests cover 360, 390, 768, 1366 for landing/login and passed locally.
- Owner Dashboard and Settings Location section need manual/mobile screenshot review.

## Error / Empty State Audit

Good:
- Most data lists have loading skeletons and empty states.
- Bot status has user-facing states.

Needs work:
- Fixed: server configuration errors no longer expose raw env names such as `SUPABASE_SERVICE_ROLE_KEY`, `BOT_API_TOKEN`, or Gemini API key names in user-facing API responses.
- AI degraded mode can still surface provider-specific messages.
- Owner/Bot API fallback merge can show success-like UI while approval action fails later.

## Automated Tests Added

- `playwright.config.ts`
- `e2e/public-navigation.spec.ts`
- `e2e/authenticated-flows.spec.ts`

Safe defaults:
- Public navigation/responsive smoke tests can run without credentials.
- Authenticated tests skip unless `E2E_EMAIL` and `E2E_PASSWORD` are set.
- Mutation tests skip unless `E2E_RUN_MUTATION=true` is explicitly set with a safe test database/group.

Required safe test env:

```text
E2E_BASE_URL=http://127.0.0.1:3000
E2E_EMAIL=admin-test@example.com
E2E_PASSWORD=...
E2E_GROUP_ID=120xxx@g.us
E2E_RUN_MUTATION=true
```

## Current Tooling Status

- Build: ✅ passes.
- Lint: ✅ exits successfully.
  - `BotUang/` is ignored by root dashboard lint because it is classified as bot runtime CommonJS code.
  - Remaining active dashboard lint status: 9 warnings, 0 errors.
  - Active setState-in-effect errors were fixed in connect/dashboard/settings/owner/AI orb code paths.
- E2E package: ✅ `@playwright/test` installed.
- Playwright browser binaries: ✅ Chromium installed.
- Public Playwright smoke test: ✅ `npx playwright test e2e/public-navigation.spec.ts` passed 12/12.
