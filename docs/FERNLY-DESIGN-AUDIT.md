# Fernly Design Audit

Audit date: 2026-10-06  
Reference: https://demo.codeandchill.store/fernly/  
Artifacts captured locally: `C:/tmp/fernly-1440.png`, `C:/tmp/fernly-1366.png`, `C:/tmp/fernly-1024.png`, `C:/tmp/fernly-768.png`, `C:/tmp/fernly-430.png`, `C:/tmp/fernly-390.png`, `C:/tmp/fernly-360.png`

This document records the Fernly visual system for adapting BotUang. Fernly is a design reference only. Do not copy Fernly branding, text, proprietary business data, or decorative product concepts.

## 1. App Shell

### Desktop: 1366-1440px

- Outer background: light warm gray, approximately `rgb(233,235,233)`.
- Page margin/gutter: 12px around the whole app.
- Sidebar:
  - Width: about 252px.
  - Position: fixed-ish left rail inside the outer gutter.
  - Height: viewport minus 24px.
  - Radius: 26px.
  - Surface: `rgb(245,246,245)`.
  - No visible border; relies on surface contrast.
- Main shell:
  - Starts at x about 276px, leaving 12px gutter + 252px sidebar + 12px gap.
  - Width at 1440: about 1152px.
  - Topbar height: about 70px.
  - Board/content panel starts below topbar with about 12px vertical gap.
  - Board radius: 26px.
  - Board surface: `rgb(245,246,245)`.
- Board internal padding:
  - Desktop: about 20px.
  - Header block: content starts about 20px from board edge.
- Section gaps:
  - Cards and chart grid gap: about 16px.
  - Header to KPI grid: about 18px.

### Tablet: 768-1024px

- Sidebar becomes off-canvas:
  - Width: about 290px.
  - Hidden left at about `x=-304px`.
  - Open-state shadow appears prepared: `20px 0 60px -20px rgba(19,26,21,.35)`.
  - Radius: `0 26px 26px 0`.
- Topbar remains mounted:
  - Margin: 14px.
  - Height: about 86px.
  - Radius: 26px.
  - Hamburger appears at left.
- Board:
  - x/y: 14px / 114px.
  - Radius: 26px.
  - Content grid becomes two columns for stats and lower panels.

### Mobile: 360-430px

- Outer gutter: 10px.
- Topbar:
  - x/y: 10px.
  - Height: about 68px.
  - Radius: 22px.
  - Hamburger left, compact search, avatar right.
  - Some desktop actions are hidden.
- Board:
  - x/y: 10px / 88px.
  - Width: viewport minus 20px.
  - Radius: 22px.
  - Padding: about 12px.
- KPI grid:
  - Two columns even at 360px.
  - Card width at 390px: about 167px.
  - Card height at 390px: about 177px.
  - Text wraps naturally; no horizontal overflow.

## 2. Colors

Measured values from DOM inspection:

| Token | Approx value | Usage |
|---|---|---|
| `fernly-bg` | `rgb(233,235,233)` / `#E9EBE9` | Page background |
| `fernly-surface` | `rgb(245,246,245)` / `#F5F6F5` | Sidebar, topbar, board |
| `fernly-card` | `rgb(253,253,252)` / `#FDFDFC` | Cards, search input, icon buttons |
| `fernly-text` | `rgb(19,26,21)` / `#131A15` | Primary text |
| `fernly-muted` | `rgb(100,109,103)` / `#646D67` | Body secondary text |
| `fernly-muted-2` | `rgb(108,117,111)` / `#6C756F` | Nav labels |
| `fernly-primary` | `rgb(13,58,35)` / `#0D3A23` | Primary button, dark green accents |
| `fernly-primary-2` | `rgb(29,115,71)` / `#1D7347` | Logo/nav active |
| `fernly-soft-green` | `rgb(185,230,203)` / `#B9E6CB` | Positive note on dark card |
| `fernly-chip-bg` | `rgb(241,248,243)` / `#F1F8F3` | Icon circles / light green controls |
| `fernly-danger` | `rgb(214,58,58)` / `#D63A3A` | Stop/destructive button |
| `fernly-avatar` | peach tone around `#F5C5AC` | User avatar background |

Notes:

- Green is deep and restrained, not neon.
- Active financial/product highlight uses one dark green card, while most UI remains neutral.
- Borders are often simulated with inset shadows rather than visible border lines.
- Low-contrast placeholder panels are common but should be avoided in BotUang unless they represent real loading/empty states.

## 3. Typography

- Font: `Plus Jakarta Sans`, fallback `system-ui, -apple-system, Segoe UI, sans-serif`.
- Letter spacing: normal; no aggressive tracking except small uppercase labels.
- Page title:
  - Desktop: 34px, weight 600, line-height around 1.1.
  - Mobile: about 28px, weight 600.
- Sidebar brand:
  - 22px, weight 600.
- Nav link:
  - 16px.
  - Active weight 600.
  - Inactive weight 400.
- Nav section label:
  - 12px, weight 500, uppercase-ish.
- Body:
  - 15px, weight 400.
- Section/card title:
  - 18-20px, weight 500-600.
- KPI number:
  - Desktop: about 48px, weight 600.
  - Mobile: about 42-48px depending card width.
- Caption/supplementary:
  - 13.5px, weight 400.
- Button:
  - 16px, weight 500.

## 4. Radius

| Element | Approx radius |
|---|---:|
| App shell panels/sidebar/topbar/board | 26px desktop, 22px mobile |
| Cards | 20px |
| Promo card | 20px |
| Buttons/chips/search | 999px pill |
| Icon buttons | 50% or 12px for square hamburger |
| Nav active rail | `0 6px 6px 0` |
| Small badges | 5-6px |
| Off-canvas sidebar | `0 26px 26px 0` |

BotUang adaptation:

- Use 22-26px only for app shell surfaces.
- Use 18-20px for major cards if matching Fernly.
- Avoid applying `rounded-3xl` everywhere.

## 5. Shadows

- App shell surfaces mostly use no shadow.
- Neutral cards:
  - `0 1px 2px rgba(19,26,21,.04), 0 8px 24px -12px rgba(19,26,21,.10)`.
- Primary hero card:
  - `0 14px 30px -16px rgba(13,58,35,.70)`.
- Off-canvas sidebar:
  - `20px 0 60px -20px rgba(19,26,21,.35)`.
- Template floating pill:
  - high-contrast black with hard offset shadow; this is reference-site chrome, not suitable for BotUang.
- Dropdown/modal shadows were not strongly visible in available states; use soft, low-opacity shadows consistent with cards.

## 6. Component Style

### Sidebar

- Very calm, no filled active nav item.
- Active state is a vertical green rail at the far left plus darker text/icon.
- Inactive items are muted gray.
- Nav link height about 41px.
- Icon left alignment at about 40px desktop x-position.
- Main and general nav groups have labels.
- Bottom promo card is decorative and should not be copied into BotUang unless replaced with product value.

### Topbar

- Large rounded shell, not a thin enterprise header.
- Search input is a white pill around 380px desktop, 46px tall.
- Shortcut pill appears inside search (`Ctrl K`).
- Notification buttons are round white icons, about 46px.
- Profile area is compact pill-like row with avatar and text.
- Tablet/mobile topbar shows hamburger and hides some actions.

### Buttons

- Primary button: dark green pill, 48px high desktop.
- Ghost/secondary button: white card-like pill with dark green inset stroke.
- Mobile buttons remain tall and easy to tap.
- Hover likely uses subtle magnetic/press behavior, not flashy glow.

### Cards

- White/off-white card on slightly darker surface.
- Radius 20px.
- Padding 18-20px desktop, 16px mobile.
- No heavy border.
- Card shadows are subtle.
- Hero stat card uses dark green fill, white text, and soft dark-green drop shadow.

### KPI Cards

- Four card grid desktop.
- At 1024/768/mobile: two columns.
- Each card has title, arrow circle in top-right, big number, and compact trend/caption.
- BotUang should map to: Saldo Kas, Pemasukan, Pengeluaran, Transaksi.

### Tables / Lists

- Fernly demo emphasizes cards/lists over dense tables.
- Project list uses icon/avatar + title + due date, with low contrast secondary text.
- BotUang desktop tables should be clean and flat, not bordered-heavy.
- Mobile should become list rows/cards, not squeezed tables.

### Charts

- Chart bars are rounded pills/organic bars.
- Very low axis density.
- Labels below bars with muted text.
- Chart card has large whitespace but still purposeful.
- BotUang Recharts should prefer simple rounded bars/areas and muted grid lines.

### Badges

- Small pill/rounded rectangles.
- Low contrast; not random.
- Status colors are muted: green, amber, red only where meaningful.

### Forms / Inputs

- Search input pill is the dominant field style.
- Inputs should be soft white on shell surfaces.
- Focus should be visible but not neon.

## 7. Motion

Observed and inferred from visible states/classes:

- Hash navigation uses anchors and stays within one app shell.
- Title letters appear split into character spans (`.ch`), suggesting entrance animation/stagger.
- Buttons include class `magnetic`, implying subtle pointer-follow or hover transform.
- Chart bars appear animated/interactive; bar buttons expose accessible labels.
- Hover/active likely uses small transform, color/shadow changes, not large motion.
- Off-canvas sidebar is prepared for slide-in with shadow.
- Recommended BotUang timing:
  - Section transition: 150-220ms opacity + 4-8px y movement.
  - Sheet/sidebar: 220-280ms ease-out.
  - Hover card lift: 120-180ms.
  - Button press: 80-120ms scale/translate.
  - Chart entrance: 250-450ms staggered but subtle.
- Respect `prefers-reduced-motion`.

## 8. Responsive Behavior

### Breakpoints inferred

- Desktop sidebar is present at 1366/1440.
- At 1024 and below, sidebar is off-canvas and hamburger appears.
- 768 still uses two-column KPI layout and two-column lower panels.
- 430/390/360 use:
  - Topbar compact.
  - Main board single major column, but KPI cards remain 2-up.
  - Profile text hidden; avatar stays.
  - Search remains visible but narrower.
  - No horizontal overflow at all measured viewports.

### Mobile implications for BotUang

- Use the prompt-required 5-item bottom nav, but make it visually compatible with Fernly:
  - rounded elevated surface,
  - muted icons,
  - center AI action emphasized but not huge,
  - safe-area padding.
- Use a menu sheet for secondary sections.
- Keep shell visible while content changes.
- Avoid desktop sidebar compression.

## Reference Summary

Fernly feels polished because of:

1. Large rounded app shell surfaces with very quiet contrast.
2. A restrained palette: mostly neutral, one deep-green primary.
3. Clear hierarchy through spacing and type, not decoration.
4. Cards that are soft but not glassy.
5. Hash-style instant navigation with persistent chrome.
6. Mobile/tablet layouts designed intentionally, not simply stacked desktop.
7. Motion implied by small, purposeful transitions and interactive chart/buttons.

BotUang should adopt these principles while keeping financial hierarchy, real group data, BotUang branding, and existing business logic.
