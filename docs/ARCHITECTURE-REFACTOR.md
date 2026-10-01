# BotUang Architecture Refactor

## Current Problems

- The dashboard is mostly one large client component (`app/components/dashboard-page.tsx`) mounted by thin route wrappers. Sidebar/header are recreated for each dashboard route instead of living in a persistent App Router layout.
- Authentication currently mixes Supabase email login, WhatsApp dashboard tokens, localStorage session state, and owner email allow-listing. Group access is not represented as a durable `user -> groups` relationship.
- Admin and owner role checks are inconsistent. Owner API routes validate Supabase identity server-side, but normal group dashboard routes still trust browser-provided `groupId` and session token.
- Existing data access is scattered in React components. Supabase queries, Bot API proxy calls, normalization, mutations, and UI state all live together.
- The current group model is effectively "one active group in localStorage". This blocks a true multi-group workspace and makes owner/admin group switching awkward.
- Several internal navigations still use `window.location.href`, causing full document reloads and making the dashboard feel slower than a single cohesive app.
- Production data lives in existing Supabase tables and the WhatsApp bot SQLite/API. Any refactor must be additive and preserve those records.

## Current Routes And Data Flows

- Public routes:
  - `/` renders the landing page.
  - `/login` handles Supabase email/password login.
  - `/connect` validates WhatsApp dashboard links and stores a local dashboard session.
- Group workspace routes:
  - `/dashboard`
  - `/dashboard/participants`
  - `/dashboard/todos`
  - `/dashboard/reminders`
  - `/dashboard/commands`
  - `/dashboard/settings`
  - `/dashboard/owner`
- API routes:
  - `/api/bot/status` proxies bot health/status.
  - `/api/bot/group-data` proxies group-scoped Bot API resources.
  - `/api/bot/owner` proxies privileged owner Bot API resources after Supabase owner validation.
  - `/api/bot/action` is a legacy generic action proxy.
- Existing client data sources:
  - Supabase tables: `transactions`, `participants`, `todos`, `reminders`, `custom_commands`, `group_rentals`, `group_settings`, `dashboard_tokens`, `rental_requests`.
  - Bot API tunnel: group data and owner operations.

## New Architecture

BotUang becomes a multi-group financial workspace:

```text
Account
  Role: OWNER | ADMIN
  Group Access: one or many WhatsApp groups
  Active Group: selected in the workspace shell
```

The product has two contexts:

- Group Workspace: finance-first dashboard for one selected WhatsApp group.
- Owner Control Center: global BotUang service management, visible only to OWNER.

## Role Model

- `OWNER`: platform owner. Can access Owner Control Center and can also open group workspaces.
- `ADMIN`: group operator. Can access only groups granted to the account.

Platform role is separate from per-group access. A user can be platform OWNER and still have per-group role `admin` or `owner` in a selected group.

## Group Access Model

Add a durable access table:

```text
user_group_access
  id uuid primary key
  user_id uuid references auth.users(id)
  group_id text references group_rentals(group_id)
  role text check ('owner','admin')
  created_at timestamptz
  updated_at timestamptz
  last_selected_at timestamptz
```

WhatsApp `/connect` flow should:

1. Validate `group_id` and dashboard `token` against the Bot API.
2. Verify or set PIN.
3. Require a Supabase account session when linking persistent access.
4. Upsert `user_group_access`.
5. Set active group in client state.

During transition, the app may keep the existing localStorage session for WhatsApp token compatibility, but it must not be the long-term authorization source.

## Route Structure

Target App Router structure:

```text
app/
  dashboard/
    layout.tsx
    page.tsx
    transactions/
    participants/
    todos/
    reminders/
    commands/
    reports/
    spreadsheet/
    utilities/
    settings/
    rental/
  owner/
    layout.tsx
    page.tsx
    groups/
    rentals/
    payments/
    qris/
    notifications/
    broadcast/
    server/
    backup/
    settings/
```

Short-term Phase 1 keeps existing route wrappers working while introducing shared shell state and group switching. Later phases should split the large dashboard component into route-specific modules and move the shell to `app/dashboard/layout.tsx`.

## Database Changes

Required additive migration:

- `user_group_access`: persistent multi-group account access.
- `user_profiles`: platform role metadata for server-side role checks.

Future additive migrations:

- `owner_notifications`: notification center for rental requests, expiring rentals, and payment events.
- Spreadsheet connection tables when Google authorization is available.
- Regional services settings columns or a dedicated settings table if current `group_settings` cannot represent weather/prayer/alerts toggles cleanly.

No existing table should be dropped, truncated, or replaced.

## API Architecture

- Privileged Bot operations must run through Next.js server routes.
- Browser code must never receive `BOT_API_TOKEN`, `GEMINI_API_KEY`, Google credentials, backup keys, or encryption secrets.
- Group-scoped API routes must validate both Supabase identity and group access. During the transition, a verified dashboard session token can still be forwarded to the Bot API.
- Owner API routes must validate Supabase identity and platform role before proxying to the Bot API.

## Security Model

- UI visibility is not authorization.
- `group_id` from browser state is only a selection hint. Server routes must verify that the current user can access the group.
- Owner checks use `user_profiles.platform_role = 'owner'` or a server-side owner email allow-list during migration.
- RLS policies must protect `user_group_access` and, where possible, group-scoped Supabase tables.
- Admin rental extension requests may create `rental_requests`; approval must remain an owner-only server-side operation.

## Migration Plan

1. Add access-model tables and RLS policies.
2. Link current owner account and existing group access without modifying existing finance records.
3. Replace localStorage-only group selection with a group switcher fed from server-validated access.
4. Move dashboard shell to persistent App Router layout.
5. Split dashboard features into finance-first modules.
6. Add owner modules with secure server routes.
7. Add AI and integration layers after finance/auth are stable.

## Implementation Phases

### Phase 1 - Architecture

- Document existing routes/data flows.
- Add additive access-model migration.
- Keep OWNER and ADMIN semantics explicit.
- Add group switcher to the dashboard shell.
- Fix owner sidebar access to include group workspace plus owner section.
- Reduce full-page internal navigation where feasible.

### Phase 2 - Finance Core

- Finance-first overview.
- Dedicated transactions route/module.
- Reports, export, participants, and rental flow.

### Phase 3 - Owner

- Owner overview, groups, rentals, payments, QRIS, notifications, broadcast, server, backup.

### Phase 4 - AI

- Server-only Gemini provider.
- Structured intent parser.
- Confirmation-first transaction creation.

### Phase 5 - Integrations

- Spreadsheet abstraction.
- Location Center.
- Weather, Prayer, Alerts, Calculator.

### Phase 6 - Quality

- Realtime review.
- Security and RLS review.
- Mobile and performance review.
- Anti-AI-slop UI review.
