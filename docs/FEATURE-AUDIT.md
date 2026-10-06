# BotUang Final Production Feature Audit

Audit date: 2026-10-06

Production: `https://www.dashboardits.tech`

Scope: deployed Next.js dashboard, Supabase project `xauwlfhlrtwblstgptyk`, VPS Bot API, and WhatsApp-facing integration paths.

## Status Legend

- ✅ VERIFIED: exercised successfully in production with evidence at the relevant layer.
- ⚠️ PARTIAL: some layers work, but the complete user outcome was not verified.
- ❌ BROKEN: a production test failed or required data is inconsistent/missing.
- ❓ NOT VERIFIED: intentionally not executed because it requires external confirmation, new credentials, or a dangerous production action.

## Production Evidence

- Public responsive Playwright suite: 18/18 passed at 360, 390, 430, 768, 1024, 1366, and 1440 px.
- Final non-mutating run before the logout race fix: 25 passed, 2 intentionally skipped, 1 failed. The failed logout race was fixed in commit `6f2e6f5` and has a targeted regression test.
- Final targeted post-deploy regressions: 4/4 passed for logout/login restoration and unauthenticated Bot action rejection on desktop and mobile.
- Authenticated mobile 390 px test after navigation fix: passed, including no horizontal overflow, centered AI action, bottom navigation, and theme switch.
- Browser network/security audit: passed with no page errors, failed requests, HTTP 4xx/5xx, or server-secret patterns in browser requests.
- Production build: passed. Lint: 0 errors and 6 existing warnings.
- Bot status: connected through `/api/status` on the active VPS tunnel.
- Direct Bot API reads: owner health, five groups, DB statistics, reminders, commands, and rental endpoints returned HTTP 200.
- Owner proxy after fallback fix: groups, health, DB stats, and rental requests returned `ok: true`.
- AI parser: five supported intents returned in 0.3-0.6 seconds from the local parser.
- Safe Bot API CRUD isolation: temporary Todo, Reminder, and Command records could be created/read/deleted through the authorized group proxy.
- All `PRODUCTION-SMOKE-*` records were removed from Supabase and the VPS Bot database after testing.

## Final Product Matrix

| Feature | Automated Test | Production Test | Persistence | WhatsApp Integration | Status | Notes |
|---|---|---|---|---|---|---|
| Landing and public navigation | Playwright responsive suite | Passed on production | N/A | N/A | ✅ VERIFIED | No horizontal overflow at required widths. |
| Login | Authenticated Playwright | Owner login succeeds | Supabase session verified | N/A | ✅ VERIFIED | Invalid/expired session routing exists; invalid credentials were not brute-force tested. |
| Register | UI/code inspection | Form exists under `/login` | Supabase Auth path exists | N/A | ⚠️ PARTIAL | There is no separate `/register` route. A new production account was not created. |
| Email confirmation | None | Not executed | Provider-dependent | N/A | ❓ NOT VERIFIED | Requires a disposable email and production SMTP verification. |
| Session refresh | Playwright reload test | Passed | Supabase session remains valid | N/A | ✅ VERIFIED | Dashboard remains accessible after refresh. |
| Logout and login again | Playwright regression | Passed on desktop and mobile | Local session removed; group access restored after login | N/A | ✅ VERIFIED | Post-deploy regression passed after fix `6f2e6f5`. |
| Group access restoration | Authenticated Playwright | Group ID restored after login | `user_group_access` persists | N/A | ✅ VERIFIED | Access survives logout/login independently of the local dashboard session. |
| Connect by Group ID/PIN | API/code inspection | Existing group lookup returned not found | `group_rentals` row is missing | Bot token path exists | ❌ BROKEN | The account has `user_group_access`, but production `group_rentals` cannot find this group. Wrong/correct PIN cannot complete. |
| Dashboard token and expiry | Code inspection | No fresh safe token available | Validation and expiry code exist | Token generation not exercised | ❓ NOT VERIFIED | Requires a newly generated `dash` link from WhatsApp. |
| Multi-group access | Group API and owner API reads | Owner sees one linked Supabase group and five VPS groups | Two sources disagree | VPS group list verified | ⚠️ PARTIAL | Supabase access list is not synchronized with the VPS owner group list. |
| Real group name | UI/API comparison | Sidebar shows `Grup Keuangan`; VPS shows `Manage Keuangan Radit` | Supabase access name is stale | VPS name verified | ❌ BROKEN | Real name is available from Bot API but not synchronized into dashboard group access. |
| Bot status | Browser and endpoint checks | `Bot Terhubung` | N/A | VPS `/api/status` connected | ✅ VERIFIED | No longer stuck in the checking state. |
| Overview empty state | Browser inspection after cleanup | Balance/income/expense/transactions return to zero | Supabase smoke rows cleaned | Bot transactions count is zero | ✅ VERIFIED | No fake records were inserted for presentation. |
| Transaction create | Playwright mutation | Appeared initially and later persisted | Supabase insert works | VPS transaction table remained empty | ⚠️ PARTIAL | Dashboard writes Supabase while WhatsApp bot uses a separate SQLite source. |
| Transaction edit/delete | Playwright mutation | Failed after refresh/cleanup path | Production RLS lacks UPDATE policy | Not reached | ❌ BROKEN | Migration `202610060001_fix_finance_crud_update_policies.sql` is committed but not applied to production. |
| Transaction totals/chart | Browser inspection | Uses real active Supabase transactions | Derived client-side | No canonical Bot sync | ⚠️ PARTIAL | Correct for the selected dashboard source, but sources can diverge. |
| Transaction search/filter/export | Code and UI smoke | Controls render; no destructive action | Client-side only | N/A | ⚠️ PARTIAL | Full CSV content comparison was not performed. |
| Participants CRUD | Existing automated coverage only | Not mutated in production | Supabase/Bot dual path | Not tested from WhatsApp | ❓ NOT VERIFIED | Avoided adding a fake production member. |
| Todo CRUD | Full Playwright mutation | Create, refresh, complete, edit, delete passed | Persistence verified | Bot proxy CRUD separately verified | ✅ VERIFIED | Temporary Todo data was cleaned. |
| Reminder web CRUD | Playwright mutation | New item never appeared; no edit UI | Supabase/Bot source conflict | Existing VPS reminder is readable | ❌ BROKEN | Read prefers non-empty Bot list while fresh login writes to Supabase; local migration also lacked reminder UPDATE. |
| Reminder scheduler | Code/API inspection | Existing reminder visible | VPS contains one reminder | Actual scheduled delivery not observed | ❓ NOT VERIFIED | Web CRUD success must not be treated as scheduler success. |
| Custom Command web CRUD | Playwright mutation | New command never appeared | Supabase/Bot source conflict | VPS contains three commands | ❌ BROKEN | Fresh login writes Supabase while display prefers Bot commands. |
| Custom Command Bot API | Authorized API isolation | Create/read/delete succeeded | VPS persistence verified | Actual WhatsApp keyword response not sent | ⚠️ PARTIAL | Dashboard path remains broken even though Bot API CRUD works. |
| AI transaction parsing | Direct production API tests | Income Rp1,000,000 and expense Rp5,000 parsed correctly | No write during parse | N/A | ✅ VERIFIED | Parser is now local-first for supported explicit commands. |
| AI Todo/Reminder/Command parsing | Direct production API tests | All three intents parsed correctly | No write during parse | N/A | ✅ VERIFIED | `besok 08:00` resolves to a `datetime` on the following date. |
| AI confirmation and save | UI/code inspection | Parse verified; save not executed after finance blocker | Depends on broken/split CRUD paths | Not verified | ⚠️ PARTIAL | AI does not auto-save, but canonical persistence is not trustworthy yet. |
| Calculator | Mobile/browser UI inspection | Bubble is present | N/A | N/A | ⚠️ PARTIAL | Arithmetic cases were not exhaustively tested in production. |
| Weather | Settings/code inspection | No real dashboard weather response tested | Location/toggle fields only | WhatsApp weather command not exercised | ❌ BROKEN | Current dashboard is configuration-only; no verified live weather provider result. |
| Prayer settings/status | Authenticated API check | Status is `disabled` | Settings endpoint responds | Scheduler not observed | ⚠️ PARTIAL | No schedule, coordinates, next prayer, or offset can be verified while disabled. |
| Test Azan | Authenticated endpoint | API returned “sent to WhatsApp” | N/A | Receipt not independently observed | ⚠️ PARTIAL | Requires a person in the target WhatsApp group to confirm receipt. |
| Emergency alert | Code inspection | Toggle/configuration only | Settings fields exist | No alert provider/scheduler | ❌ BROKEN | No verified BMKG or equivalent delivery path. |
| Rental status | Owner Bot API read | VPS says active until 2029-06-18 | Supabase `group_rentals` row missing | VPS state verified | ❌ BROKEN | Dashboard and bot do not share the same rental source of truth. |
| Extension request/proof | Owner request API read | Two pending Supabase requests exist | Supabase persistence verified | Owner notification not observed | ⚠️ PARTIAL | New upload was not created; existing proof delivery and notification were not re-tested. |
| Owner groups | API and UI wiring | Five VPS groups returned | VPS data verified | Bot API verified | ✅ VERIFIED | Fallback fix handles stale Vercel `BOT_API_URL`. |
| Owner server health/DB stats | Direct and proxied API tests | Both return `ok: true` | Read-only | VPS verified | ✅ VERIFIED | No destructive owner action was used. |
| Owner approve/reject | Authorization/code inspection | Not executed | Request mapping exists | Activation/rejection side effects unverified | ❓ NOT VERIFIED | Deliberately skipped to avoid changing real rentals. |
| Owner broadcast/reset/backup | Authorization/code inspection | Not executed | N/A | Not executed | ❓ NOT VERIFIED | Destructive or wide-impact actions were intentionally skipped. |
| Mobile shell | Authenticated Playwright at 390 px | Passed | N/A | N/A | ✅ VERIFIED | Bottom navigation, centered AI, theme toggle, and no overflow verified. |
| SPA/hash navigation | Playwright regression | Mobile bug found and fixed | N/A | N/A | ✅ VERIFIED | Links now update dashboard section state without document reload. |
| Browser runtime/network | Playwright instrumentation | Passed | N/A | Relevant proxy calls passed | ✅ VERIFIED | No hydration errors, failed requests, or HTTP 4xx/5xx in audited flow. |
| Browser secret exposure | Request URL/header/body inspection | No match | N/A | Server tokens remain server-side | ✅ VERIFIED | Checked Bot token, Supabase secret-key, and AI-key patterns. |
| Group-data authorization | HTTP negative test | Unauthenticated request returns 403 | N/A | Protected proxy | ✅ VERIFIED | Data leak found earlier was fixed in `8596623`. |
| Generic bot action authorization | Playwright negative test | Anonymous request returns HTTP 403 | N/A | Server token no longer accepted from request body | ✅ VERIFIED | Post-deploy regression passed on desktop and mobile projects. |

## Production Blockers

1. **Finance update/delete RLS is not deployed.** Apply `supabase/migrations/202610060001_fix_finance_crud_update_policies.sql` to project `xauwlfhlrtwblstgptyk`, then rerun transaction and reminder CRUD.
2. **Supabase and VPS Bot SQLite are competing sources of truth.** A fresh login has no `apiUrl`; Reminder and Command mutations go to Supabase while reads prefer non-empty Bot API arrays.
3. **Rental/group metadata is missing or stale in Supabase.** `user_group_access` says `Grup Keuangan`, `group_rentals` lookup fails, while VPS reports `Manage Keuangan Radit` active through 2029-06-18.
4. **Reminder and Command dashboard CRUD cannot be trusted.** Both failed production create/display tests even though direct Bot API CRUD works.

## Major Bugs

- Transaction edit/delete and cleanup are blocked by the production RLS policy.
- Reminder and Command writes can disappear from the UI because the write source and read source differ.
- Group connection by PIN cannot complete for the linked production group because its rental row is absent from Supabase.
- Weather and emergency features are configuration surfaces, not verified live services.

## Minor Bugs Fixed During Phase I

- Owner API now retries trusted Bot API fallbacks instead of failing on the stale Vercel host.
- Dashboard theme hydration mismatch was removed.
- Supported AI commands use the local parser before a denied/slow Gemini request.
- Mobile/desktop hash navigation now updates section state immediately.
- Logout no longer allows an in-flight dashboard boot to restore the removed local session.
- Generic Bot action proxy now requires an authenticated owner and ignores request-supplied Bot tokens.

## External Verification Required

- Registration email delivery and confirmation.
- Correct PIN and fresh WhatsApp dashboard-token flows.
- Actual receipt of the Azan test message in the WhatsApp group.
- Actual scheduled reminder delivery.
- Actual Custom Command response inside WhatsApp.
- Rental proof notification, approval, and rejection side effects.
- Dangerous owner operations such as broadcast, deactivate, reset, and restore.

## Cleanup

- Supabase: all active rows matching `PRODUCTION-SMOKE-TEST-*`, `PRODUCTION-SMOKE-TODO-*`, `PRODUCTION-SMOKE-REMINDER-*`, and `PRODUCTION-SMOKE-CMD-*` were checked and soft-deleted where present.
- VPS Bot database: zero `PRODUCTION-SMOKE` markers remain in transactions, todos, reminders, or commands.
- Current target group Bot counts after cleanup: 0 transactions, 0 todos, 1 existing reminder, and 3 existing commands.

## Recommended Next Approval

Approve a focused source-of-truth stabilization phase before adding features:

1. Apply the committed RLS migration.
2. Choose one canonical write/read service for Transactions, Reminder, Todo, Command, and Participants.
3. Backfill `group_rentals` and synchronize real group names from the VPS.
4. Rerun only the failed CRUD, PIN, rental, and WhatsApp delivery tests.
