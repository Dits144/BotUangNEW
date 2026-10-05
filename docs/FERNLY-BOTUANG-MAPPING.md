# Fernly to BotUang Mapping

Date: 2026-10-06  
Purpose: map Fernly visual/layout patterns to BotUang without changing backend, schema, auth, roles, or Bot API integrations.

## Non-Negotiables

- Backend freeze remains active.
- Do not modify Supabase schema, auth, roles, group authorization, Bot API, WhatsApp runtime, rental approval, AI parser, or prayer scheduler unless a bug is found outside the UI redesign scope.
- Redesign must preserve existing handlers/data flows.
- No fake finance data.
- Old URLs must redirect to hash routes.
- Dashboard shell must remain mounted.

## Target Dashboard Architecture

Target hash routes:

| URL | Section |
|---|---|
| `/dashboard/#overview` | Overview |
| `/dashboard/#transactions` | Transactions |
| `/dashboard/#reports` | Reports |
| `/dashboard/#spreadsheet` | Spreadsheet |
| `/dashboard/#participants` | Anggota |
| `/dashboard/#todos` | Todo |
| `/dashboard/#reminders` | Reminder |
| `/dashboard/#commands` | Command |
| `/dashboard/#weather` | Weather |
| `/dashboard/#prayer` | Prayer |
| `/dashboard/#alerts` | Alerts |
| `/dashboard/#calculator` | Calculator |
| `/dashboard/#settings` | Settings |
| `/dashboard/#rental` | Rental |
| `/dashboard/#owner` | Owner Dashboard |

Old route redirects:

| Old URL | Redirect |
|---|---|
| `/dashboard/transactions` | `/dashboard/#transactions` |
| `/dashboard/participants` | `/dashboard/#participants` |
| `/dashboard/todos` | `/dashboard/#todos` |
| `/dashboard/reminders` | `/dashboard/#reminders` |
| `/dashboard/commands` | `/dashboard/#commands` |
| `/dashboard/settings` | `/dashboard/#settings` |
| `/dashboard/calculator` | `/dashboard/#calculator` |
| `/dashboard/owner` | `/dashboard/#owner` |

Recommended component organization:

```text
app/dashboard/page.tsx

app/components/dashboard/shell/
  DashboardShell.tsx
  Sidebar.tsx
  Topbar.tsx
  MobileNavigation.tsx
  MobileMenu.tsx
  GroupSwitcher.tsx
  BotUangAiTrigger.tsx

app/components/dashboard/sections/
  Overview.tsx
  Transactions.tsx
  Reports.tsx
  Spreadsheet.tsx
  Participants.tsx
  Todos.tsx
  Reminders.tsx
  Commands.tsx
  Weather.tsx
  Prayer.tsx
  Alerts.tsx
  Calculator.tsx
  Settings.tsx
  Rental.tsx
  Owner.tsx

app/components/dashboard/ui/
  PageHeader.tsx
  StatCard.tsx
  DataTable.tsx
  MobileList.tsx
  EmptyState.tsx
  LoadingState.tsx
  FilterBar.tsx
  SearchInput.tsx
  ResponsiveSheet.tsx
```

Do this incrementally. Do not move all dashboard code at once if it risks regressions.

## Design Tokens for BotUang

Derived from Fernly, adapted for BotUang:

| Token | Light value | Dark-compatible note |
|---|---|---|
| `--bu-page` | `#E9EBE9` | Dark: `#0B0F19` or near-black neutral |
| `--bu-shell` | `#F5F6F5` | Dark: elevated slate surface |
| `--bu-card` | `#FDFDFC` | Dark: `#121826` style surface |
| `--bu-text` | `#131A15` | Dark: near-white |
| `--bu-muted` | `#646D67` | Dark: zinc/slate muted |
| `--bu-primary` | `#0D3A23` | Use for primary actions and main active financial highlight |
| `--bu-primary-2` | `#1D7347` | Active icon/rail |
| `--bu-income` | emerald semantic | Keep subtle; do not over-green the app |
| `--bu-expense` | coral/red semantic | Use for expenses only |
| `--bu-danger` | `#D63A3A` | destructive |
| `--bu-warning` | muted amber | pending/attention |
| `--bu-radius-shell` | `26px desktop`, `22px mobile` | only shell/topbar/board |
| `--bu-radius-card` | `20px` | cards |
| `--bu-radius-control` | `999px` pill or `12px` compact controls | follow component role |
| `--bu-shadow-card` | `0 1px 2px rgba(19,26,21,.04), 0 8px 24px -12px rgba(19,26,21,.10)` | dark mode reduce opacity |
| `--bu-shadow-primary` | `0 14px 30px -16px rgba(13,58,35,.70)` | use only primary stat/action cards |

## Shell Mapping

### Fernly desktop

- Left rounded sidebar.
- Top rounded topbar.
- Rounded board surface.
- Content flows inside board.

### BotUang desktop

- Use same shell proportions:
  - 12px outer page gutter.
  - Sidebar width about 252px.
  - Topbar height about 70px.
  - Board panel radius 26px.
- Sidebar top:
  - BotUang logo.
  - `BotUang`.
- Group switcher:
  - Label: `YOUR GROUPS`.
  - Show real `group_rentals.group_name`.
  - Keep raw WhatsApp ID hidden from sidebar. Show raw group ID only in Settings / Group Details.
- Active nav:
  - Fernly-like vertical rail + bold text/icon.
  - Avoid filled green pill for every active item.
- Remove promo-style decorative bottom cards unless replaced with useful status such as rental expiry or bot connection.

### BotUang tablet/mobile

- At 1024 and below, hide sidebar into sheet/drawer.
- Keep rounded topbar.
- Add prompt-required bottom navigation:
  - Home
  - Transaksi
  - AI
  - Aktivitas
  - Menu
- Center AI action should be slightly emphasized, not an oversized orb.

## Navigation Mapping

BotUang nav groups:

| Group | Sections |
|---|---|
| Overview | Overview |
| Finance | Transactions, Reports, Spreadsheet |
| Group | Anggota, Todo, Reminder, Command |
| Services | Weather, Prayer, Alerts, Calculator |
| System | Settings, Rental |
| Owner | Owner Dashboard, visible only for owner |

Fernly nav behavior to mimic:

- Hash navigation.
- Persistent shell.
- Active rail.
- Muted inactive labels.
- No document reload.
- Back/forward browser support.

## Section Mapping

### Overview

Fernly pattern:

- PageHeader with title/subtitle + actions.
- 4 KPI cards.
- Main chart card.
- Secondary compact panels/lists.

BotUang content:

- Header:
  - `Overview`
  - `Ringkasan keuangan {realGroupName}`
  - Primary: `+ Catat Transaksi`
- KPI:
  - Saldo Kas: hero dark green card.
  - Pemasukan.
  - Pengeluaran.
  - Transaksi.
- Chart:
  - `Arus Kas`.
  - Range controls: 7 Hari, 30 Hari, 3 Bulan, 1 Tahun.
  - Use real Recharts data.
- Secondary:
  - Recent Transactions.
  - Compact BotUang AI trigger/card.
  - Upcoming Todo/Reminder if real data exists.

Do not add filler widgets.

### Transactions

Fernly pattern:

- Clean table/list surface.
- Search and filters are compact, not huge forms.
- Mobile becomes list cards.

BotUang content:

- Header: `Transaksi`.
- Controls:
  - Search.
  - Filter: Semua / Pemasukan / Pengeluaran.
  - Date range.
  - `+ Transaksi`.
- Desktop:
  - Clean table with date, note, sender, type, amount, actions.
- Mobile:
  - Transaction list rows/cards.
  - Income/expense sign and color semantics.

### Reports

Fernly pattern:

- Chart cards and compact summary cards.

BotUang content:

- Cash Flow.
- Income vs Expense.
- Period selector.
- Only summaries derivable from `transactions`.
- No fake categories because schema has no category.

### Spreadsheet

Fernly pattern:

- Settings/reference card, not a fake integration dashboard.

BotUang content:

- If only `spreadsheet_url` exists, label as linked spreadsheet/reference.
- Do not imply live sync unless implemented.

### Participants

Fernly pattern:

- Team/list composition.
- Small avatars/initials, compact rows.

BotUang content:

- Header: `Anggota`.
- Search.
- `+ Tambah Anggota`.
- Use real `participants`.
- Do not invent payment/dues status unless supported by `participants.data`.

### Todo

Fernly pattern:

- Task list with clear status and subtle check interaction.

BotUang content:

- Existing schema only: `todo_text`, `is_done`.
- Split:
  - Belum Selesai.
  - Selesai.
- No invented priority badges.

### Reminder

Fernly pattern:

- Timeline/card list, compact schedule display.

BotUang content:

- Header: `Reminder`.
- `+ Buat Reminder`.
- Show reminder text and schedule.
- Editing on mobile through bottom sheet.

### Commands

Fernly pattern:

- Management list/table, not a giant form.

BotUang content:

- Header: `Custom Command`.
- Search.
- `+ Command`.
- Sheet/dialog for create/edit.
- WhatsApp preview can be used if it reflects actual keyword/response.

### Weather

Fernly pattern:

- Compact service card, not a giant illustration.

BotUang content:

- Use existing location settings.
- Show configured location and service enable state.
- If live weather provider is not implemented, present as configuration state, not fake weather.

### Prayer

Fernly pattern:

- Service status card + list.

BotUang content:

- `Pengingat Azan`.
- Toggle ON/OFF.
- Location.
- Next prayer if `/api/prayer/status` returns it.
- Prayer list: Subuh, Dzuhur, Ashar, Maghrib, Isya.
- `Kirim Test Reminder`.
- Do not show scheduler as working unless verified.

### Alerts

Fernly pattern:

- Empty/service configuration card.

BotUang content:

- If emergency alerts are UI-only, mark as not active/configuration only.
- Do not fake BMKG/provider alerts.

### Calculator

Fernly pattern:

- Utility surface, compact.

BotUang content:

- Keep calculator compact.
- It belongs in Services/Menu, not a giant overview card.

### Settings

Fernly pattern:

- Desktop: secondary settings nav + content surface.
- Mobile: settings list -> detail/sheet.

BotUang sections:

- Profile, if existing account metadata supports it.
- Group.
- Location & Services.
- AI.
- Notifications.
- Rental.
- Security.

Only show settings supported by current data/functions.

### Rental

Fernly pattern:

- Status card + action form, compact.

BotUang content:

- Rental active status.
- Days remaining.
- Expiry date.
- QRIS owner.
- Upload proof.
- Request extension.

### Owner Dashboard

Fernly pattern:

- Operational cards/lists with calm hierarchy.

BotUang content:

- Owner groups/rentals.
- Rental requests.
- QRIS management.
- Server status.
- Broadcast actions.
- Keep owner-only visibility.

## BotUang AI Mapping

Desktop:

- Global compact trigger.
- Right-side sheet or compact panel.
- Stays mounted with shell.

Mobile:

- Center bottom nav action.
- Opens sheet.

Flow:

1. User enters natural command.
2. AI parses intent.
3. Confirmation card shows:
   - action type,
   - amount or content,
   - note/schedule/keyword.
4. User must confirm before save.
5. Save through existing handlers.

Do not convert AI into a generic chatbot. It is a financial/action assistant.

## Motion Mapping

Use `motion/react` for:

- Hash section transition: opacity + 4-8px y, 150-220ms.
- Active nav rail transition: 150-220ms.
- Mobile menu sheet: 220-280ms.
- Dialog/sheet entrance: 180-260ms.
- Card hover: 120-180ms slight translate/shadow.
- Button press: 80-120ms active scale.
- List insertion: subtle fade/translate only after CRUD success.

Avoid:

- continuous floating cards,
- glowing borders,
- large stagger on every element,
- decorative bokeh/orbs.

## Implementation Phases

### Phase A - Reference Audit + Tokens

- Completed by `docs/FERNLY-DESIGN-AUDIT.md` and this mapping.
- No dashboard code changes.

### Phase B - Shell + Hash Router

- Introduce Fernly-inspired shell tokens.
- Convert dashboard section selection to hash router.
- Keep old route redirects.
- Preserve existing group/session load logic.
- Add mobile bottom nav + menu sheet.
- Test: build, lint, public Playwright, manual hash navigation.

### Phase C - Overview + Transactions

- Redesign overview.
- Redesign transaction table/mobile list.
- Preserve create/edit/delete handlers.
- Test real empty states and real transaction data.

### Phase D - Reports + Group

- Reports, Participants, Todo, Reminder, Commands.
- Preserve CRUD.

### Phase E - Services + Settings

- Weather, Prayer, Alerts, Calculator, Settings, Rental.
- Preserve prayer/rental integrations.

### Phase F - Owner

- Owner dashboard visual pass.
- Preserve owner authorization and actions.

### Phase G - Motion + Polish

- Apply transitions.
- Final visual consistency pass.

### Phase H - QA

- Test viewports: 360, 390, 430, 768, 1024, 1366, 1440.
- Run `npm run build`.
- Run `npm run lint`.
- Run `npx playwright test`.
- Authenticated/mutation tests only with safe env.

## Known Differences From Fernly That BotUang Should Keep

- BotUang is finance-first, not project management.
- BotUang needs transaction/mobile list patterns not present in Fernly.
- BotUang requires bottom nav with AI center action on mobile.
- BotUang must support owner/admin roles and multi-group context.
- BotUang must keep real WhatsApp/Supabase/Bot API integrations.
- BotUang should not copy Fernly promo card, template pill, project names, user identity, or sample data.
