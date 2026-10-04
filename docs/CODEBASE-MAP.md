# BotUang Codebase Map

Last updated: 2026-10-05

This map classifies the current repository before lint cleanup. Do not delete or rewrite legacy/runtime code until the runtime dependency is explicitly replaced and verified.

## Active Production Code

| Path | Classification | Evidence / Notes |
|---|---|---|
| `app/` | ACTIVE - Next.js dashboard | App Router pages, API routes, shared UI, Supabase access, Bot API proxy, dashboard shell. Covered by `next build`. |
| `app/api/` | ACTIVE - server API | Authenticated group access, bot proxy, owner proxy, prayer, rental request, storage upload, AI parser. |
| `app/components/` | ACTIVE - dashboard UI | Landing, login/connect, main dashboard, owner dashboard, shadcn-style local UI components. |
| `app/lib/` | ACTIVE - shared dashboard utilities | Supabase clients, Bot API URL validation, formatting, image upload, prayer helpers. |
| `app/dashboard/**/page.tsx` | ACTIVE - routes | Route entries under persistent dashboard layout. Most render through `DashboardPage`. |
| `public/` | ACTIVE - static assets | BotUang logo/mark/favicon and default Next assets. |
| `supabase/migrations/` | ACTIVE - database migrations | Defines dashboard schema additions, image buckets, multi-group access, prayer settings. |
| `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs` | ACTIVE - dashboard tooling | Used by Next.js build/lint/type checking. |
| `package.json`, `package-lock.json` | ACTIVE - dashboard package | Root app scripts and dependencies for Next.js/Vercel. |

## Shared / Integration Code

| Path | Classification | Evidence / Notes |
|---|---|---|
| `docs/` | SHARED - operational documentation | Architecture notes, environment, migrations, feature audit, fix plan, codebase map. |
| `e2e/` | TEST - Playwright | Public smoke tests and guarded authenticated/mutation specs. |
| `playwright.config.ts` | TEST - Playwright config | Starts local dev server unless `E2E_USE_EXISTING_SERVER` is set. |
| `AGENTS.MD` | SHARED - engineering rules | Product/UI rules for BotUang dashboard work. |
| `README.md` | SHARED - deployment docs | Dashboard env and deployment notes. |

## Bot Runtime Code

| Path | Classification | Evidence / Notes |
|---|---|---|
| `BotUang/` | BOT RUNTIME - required by WhatsApp VPS bot | Has independent `package.json` with `main: index.js`, `scripts.start: node index.js`, Baileys/Express/better-sqlite3 dependencies, command handlers, DB adapter, API routes. Do not convert CommonJS to ESM for root lint without testing VPS runtime. |
| `BotUang/index.js` | BOT RUNTIME - WhatsApp command process | Imports Baileys, command modules, database, starts API via `startApi`. |
| `BotUang/api.js` | BOT RUNTIME - Express API server | Mounts `api-routes.js`, exposes Bot API consumed by dashboard proxy routes. |
| `BotUang/api-routes.js` | BOT RUNTIME - dashboard integration surface | Provides group data/actions, owner APIs, prayer/test routes, rental notify endpoints. Deployed previously to VPS. |
| `BotUang/commands/` | BOT RUNTIME - WhatsApp command handlers | Finance, participants, reminders, todo, weather, owner/admin commands and help menu. |
| `BotUang/db/` | BOT RUNTIME - SQLite/Supabase adapter | Runtime persistence for bot commands and sync hooks. |
| `BotUang/utils/` | BOT RUNTIME - bot utilities | Parser, date, formatting, typo, session, external dashboard sync utilities. |
| `BotUang/scripts/` | BOT RUNTIME - owner ops | Backup/restore utilities used by owner commands. |
| `BotUang/media/`, `BotUang/backups/` | RUNTIME DATA | Bot media/backups. Treat as runtime data, not dashboard source. |
| `BotUang/node_modules/` | RUNTIME DEPENDENCIES | Nested bot install. Should not be linted by root dashboard lint. |
| `BotUang/wabot-dashboard/` | LEGACY / UNKNOWN | Appears as old dashboard subfolder under bot runtime. Not referenced by root Next app. Verify before delete. |
| `BotUang/src/` | LEGACY / UNKNOWN | Not referenced by root Next app or bot `package.json` scripts in this pass. Verify before delete. |
| `BotUang/wa-bot.js` | LEGACY / ALTERNATE BOT ENTRY | Separate bot entry from `index.js`; not package main. Verify before delete. |

## Generated / Build Output

| Path | Classification | Evidence / Notes |
|---|---|---|
| `.next/` | GENERATED | Next build output. Ignored by lint script. |
| `dist/` | GENERATED / old build output | Contains bundled assets/server files. Ignored by lint script. |
| `build/` | GENERATED / legacy build output | Not used by current root scripts. |
| `.wrangler/` | GENERATED / Cloudflare tooling | Not used by current Vercel deployment path. |
| `.dev-server*.log`, `.dev-server*.err` | GENERATED / local logs | Development server output. Do not commit new logs. |
| `node_modules/` | GENERATED | Root dashboard dependencies. |

## Legacy / Unused Candidates

| Path | Classification | Evidence / Notes |
|---|---|---|
| `db/` | LEGACY / UNKNOWN | Excluded from `tsconfig.json`; not referenced by root app in this pass. |
| `drizzle/` | LEGACY / UNKNOWN | Excluded from `tsconfig.json`; no root script references found. |
| `examples/` | LEGACY / EXAMPLE | Excluded from `tsconfig.json`; no production import found. |
| `tests/` | LEGACY / UNKNOWN TESTS | Separate from Playwright `e2e/`; no root script references found. |
| `worker/` | LEGACY / UNKNOWN | No root script reference found; verify Cloudflare history before delete. |

## Lint Strategy

1. Root dashboard lint should target active dashboard/test code and ignore bot runtime CommonJS code.
2. Bot runtime should have its own lint/check strategy, or at minimum `node --check` for touched runtime files before VPS deploy.
3. Do not rewrite `BotUang/` from CommonJS to ESM to satisfy root `@typescript-eslint/no-require-imports`; that would be a runtime migration, not lint cleanup.
4. Active dashboard lint baseline after this pass: `npx eslint app playwright.config.ts e2e --ignore-pattern .next --ignore-pattern dist` exits successfully with warnings only.
