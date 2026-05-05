# OMEGA Neural Core — Phase 1 + Phase 1.5

## Context

The dashboard at `/dashboard` was a generic Card-based stats screen. Phase 1 added a JARVIS-style 3D neural brain dashboard accessible via `?ui=v2` query flag, leaving the default route untouched. Phase 1.5 added a second variant — a minimalist particle sphere — at `?ui=v3` so designers can compare the two live against each other.

Both variants are visual + simulated state machine only. Phase 2 will wire the mic button to the real OMEGA backend.

## Repo

- **GitHub:** `alikhan54/zateceptionist-e7848970` (deployed via Lovable to ai.zatesystems.com)
- **Local:** `D:\420-system\frontend\`
- **Stack:** React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 (SWC) + Tailwind + shadcn/ui

## Phase 1 — Neural Brain at `/dashboard?ui=v2`

Shipped 2026-05-01 in two commits on `main`:

- `8810bb9 fix(sidebar): remove duplicate Bot import in NavigationSidebar`
- `317944f feat(omega): neural core phase 1 behind ?ui=v2 flag`

### Files added

| Path | Purpose |
|---|---|
| `src/components/omega/NeuralBrain.tsx` (709 lines) | Three.js scene: deformed icosahedron brain + wireframe + inner pulse + halo, 800 surface sparkles, 8 colored neural regions (~3,780 region particles), 28 vein pathways with 1,400 flowing particles, 6 lightning bolts, 800 ambient drift particles, GSAP-tweened state machine, mouse drag, scroll zoom |
| `src/components/omega/NeuralBrainShell.tsx` (435 lines) | Full chrome: glass top bar, left rail, agents panel (70 agents across 8 sections), metrics panel with sparklines, command bar, action card slide-in, HUD frame corners, region labels projected from 3D |
| `src/components/omega/agentRegistry.ts` (109 lines) | 70-agent placeholder data + `Agent` type |
| `src/components/omega/styles.css` (760 lines) | Component-scoped CSS. Includes the `body.omega-fullscreen` hide rule for `OmegaFloatingChat` |
| `src/pages/NeuralDashboard.tsx` (5 lines) | Page wrapper |

### File modified

- `src/App.tsx` — added `NeuralDashboard` lazy import + `DashboardRouter` wrapper that branches on `?ui=v2`. Existing `Dashboard` import preserved verbatim.

### Dependencies added

- `three@0.160.0`
- `@types/three@^0.160.0`
- (`gsap@^3.15.0` was already present)

### Architectural decisions

**Z-index overlay strategy.** `Layout.tsx` is sacred (auth + tenant guards) and unconditionally renders `<NavigationSidebar />`, `<Header />`, and `<OmegaFloatingChat />` around any routed page. Since `/dashboard?ui=v2` lives inside the `<Layout />` outlet, the new shell must overlay all that chrome.

- Shell container uses `position: fixed; inset: 0; z-index: 50` (high enough to cover sidebar + header, low enough to leave shadcn Toasts and Dialogs above it)
- On mount, the shell adds `omega-fullscreen` to `document.body`; on unmount it removes it
- `styles.css` defines: `body.omega-fullscreen [title="Chat with OMEGA (Ctrl+Shift+O)"], body.omega-fullscreen [class*="border-violet-500/30"][class*="shadow-2xl"] { display: none !important; }` — this hides both the collapsed and expanded states of `OmegaFloatingChat` without modifying its source

This keeps `Layout.tsx` and `OmegaFloatingChat.tsx` byte-identical (sacred zone respected) while delivering the full-screen takeover effect.

**Routing wrapper.** `DashboardRouter` reads `window.location.search` once on mount; switching modes requires a real navigation. Both branches stay inside `<Layout />` so auth + tenant guards apply uniformly. The original `<Dashboard />` rendering is unchanged when no `ui` query param is set.

**Round particle texture.** Three.js `PointsMaterial` defaults to square sprites. To get round glowing dots, a 96×96 `CanvasTexture` is generated once with a radial gradient (white → transparent) and applied as both `map` and `alphaMap` on every PointsMaterial. The texture is shared across all particle layers for memory efficiency.

**State machine.** `'idle' | 'listening' | 'thinking' | 'speaking'`. Demo cycle on mic click: 1.4s listening → 2.2s thinking → ~6.5s speaking → idle. GSAP tweens between configs over 800ms.

### Sacred zones (untouched in Phase 1 or 1.5)

- `src/components/Layout.tsx`
- `src/components/OmegaFloatingChat.tsx`
- `src/components/global/ThemeToggle.tsx`
- `src/components/MobileErrorBoundary.tsx`
- `src/lib/api/webhooks.ts`
- `src/lib/supabase.ts`
- `src/hooks/*`, `src/contexts/*`
- `src/styles/theme-fixes.css`, `src/index.css`
- `tsconfig*.json`, `vite.config.ts`, `tailwind.config.ts`
- All n8n webhook URLs starting with `https://webhooks.zatesystems.com/webhook/`

`src/components/NavigationSidebar.tsx` was modified once (commit `8810bb9`) to delete a duplicate `Bot,` import — a pre-existing bug, not an enhancement.

## Phase 1.5 — Particle Sphere at `/dashboard?ui=v3`

Added 2026-05-01 (later same day). A minimalist counterpart to v2 — a single cyan particle sphere with mouse-follow, dramatic OMEGA wordmark, and pure black background. The point is restraint: identical state machine to v2 so designers can compare the two live.

### Files added

| Path | Purpose |
|---|---|
| `src/components/omega/v3/ParticleSphere.tsx` (~290 lines) | Three.js scene: 10,000 particles on a Fibonacci-distributed sphere (radius 1.8), shared geometry between core (size 0.025) and glow halo (size 0.08), single-color cyan-by-default with GSAP-tweened color/size/rotation per state, mouse-follow with quadratic falloff (radius 0.6, pull 0.5, return-damping 0.15), drag rotate, scroll zoom |
| `src/components/omega/v3/ParticleSphereShell.tsx` (~135 lines) | Minimal chrome: slim top bar, large OMEGA serif italic wordmark (`clamp(72px, 12vw, 160px)`), single subhead line, state pill, transcript line, command bar. **No** agents panel, **no** metrics, **no** region labels, **no** HUD corners, **no** action card, **no** status lines |
| `src/components/omega/v3/styles.css` (~250 lines) | Component-scoped CSS. `@import "../styles.css"` reuses v2's `body.omega-fullscreen` hide rule (single source of truth). All v3 selectors prefixed `.omega-shell-v3` |
| `src/pages/NeuralDashboardV3.tsx` (5 lines) | Page wrapper |

### File modified

- `src/App.tsx` — added `NeuralDashboardV3` lazy import + one branch in `DashboardRouter`:
  ```tsx
  if (params.get("ui") === "v3") return <NeuralDashboardV3 />;
  ```
  Existing `Dashboard`, `NeuralDashboard`, and the v2 branch preserved verbatim.

### Dependencies added

**None.** v3 reuses `three@0.160.0` and `gsap@^3.15.0` from Phase 1.

### State machine (identical timing to v2 for fair comparison)

Demo fires 2.4s after mount and on mic click:

| State | Color | rotateSpeed | particleSize | Duration |
|---|---|---|---|---|
| `idle` | `#22D3EE` cyan | 0.0008 | 0.025 | base |
| `listening` | `#60A5FA` sky | 0.0006 | 0.030 | 1.4s |
| `thinking` | `#A78BFA` violet | 0.0014 | 0.028 | 2.2s |
| `speaking` | `#34D399` mint | 0.0010 | 0.027 | 5.0s |

All transitions GSAP-tweened over 800ms.

### Phase 1 files unchanged in Phase 1.5

Verified post-build: `git diff` shows zero modifications to `src/components/omega/{NeuralBrain,NeuralBrainShell,agentRegistry,styles}.{tsx,ts,css}` or `src/pages/NeuralDashboard.tsx`. v2 still works identically.

### Mouse-follow algorithm

Each frame, the mouse NDC `(x, y)` is unprojected onto the `z = 0` plane via the camera's inverse-projection. For every particle:

1. Compute Euclidean distance to the unprojected mouse point.
2. If `dist < MOUSE_INFLUENCE` (0.6 units), apply pull: `pull = (1 - dist/radius)² * MOUSE_PULL` toward the mouse target.
3. Always apply a return-to-base step: `pos += (basePos - pos) * 0.15` (per-frame, so equilibrium settles after a few frames once the mouse moves away).

Both core and glow Points share a single `BufferGeometry`, so updating positions once moves both layers in lockstep with one buffer write per frame.

## Verification

Run end-to-end:

1. `cd D:\420-system\frontend && npm run build` — must return 0
2. `npm run dev` — boots Vite at http://localhost:8080
3. Visit `/dashboard` — original dashboard unchanged
4. Visit `/dashboard?ui=v2` — Neural Brain (Phase 1)
5. Visit `/dashboard?ui=v3` — Particle Sphere (Phase 1.5)
6. On `?ui=v2` and `?ui=v3`: confirm the violet OmegaFloatingChat bubble is hidden
7. On any other route: confirm the bubble is visible
8. Mic click on either v2 or v3: state pill cycles `idle → listening → thinking → speaking → idle`

## Phase 2A — Navigation overlays (NavRail + Spotlight + Cathedral)

Added 2026-05-03. Navigation that preserves the v3 minimalism: home view stays sphere + wordmark + mic. Two overlays appear on user action only.

### What it adds

- **NavRail** — slim 4-icon left rail (Home / Inbox / Users / LayoutGrid). Glass background, indigo→violet active accent, hover tooltip with keyboard hint. Always visible on `?ui=v3`.
- **Spotlight** — ⌘K (or Ctrl+K) command palette modal. Searchable, keyboard-driven. 21 destinations across 7 groups (Suggested + 5 sections + Quick actions). Arrow keys + Enter navigate, ⌘+Enter opens in new tab, Esc closes.
- **Cathedral** — full-screen "All apps" overlay. Triggered by 4th rail icon (LayoutGrid). Hero header ("Your universe"), 4 stat cards, 12-card grid for sections (10 enabled / 2 "Coming soon"). Click card to navigate. Sphere + OMEGA wordmark fade out via `body.cathedral-open` body class.

### Files added

| Path | Lines | Purpose |
|---|---:|---|
| `src/components/omega/v3/nav/sectionsRegistry.ts` | 269 | Single source of truth: `SECTIONS` (12), `CATHEDRAL_STATS` (4), `SPOTLIGHT_ROWS` (21). Routes audited against App.tsx. |
| `src/components/omega/v3/nav/useNavOverlay.ts` | 75 | Custom hook owning Spotlight + Cathedral state. Wires global ⌘K, ⌘1/2/3, Esc shortcuts. Toggles `body.cathedral-open` class. |
| `src/components/omega/v3/nav/NavRail.tsx` | 77 | The left rail. Active state derived from `useLocation().pathname`. |
| `src/components/omega/v3/nav/Spotlight.tsx` | 221 | Command palette. Filter by name + sub + group. Hand-curated lucide icon registry. |
| `src/components/omega/v3/nav/Cathedral.tsx` | 140 | All-apps overlay. Per-card `--card-glow` CSS variable for hover-revealed radial gradient in the corner. |

### Files modified

- `src/components/omega/v3/ParticleSphereShell.tsx` (+17 lines) — pure additions: 4 imports (`useLocation`, `NavRail`, `Spotlight`, `Cathedral`, `useNavOverlay`), 2 hook calls, and the three nav components mounted at the end of the JSX. **None** of the existing elements (sphere, vignette, top bar, OMEGA wordmark, transcript, state pill, command bar, mic, demo timers, body-class management) were modified.
- `src/components/omega/v3/styles.css` (~390 appended lines) — Phase 2A CSS for cathedral fade-out, shared `.orb-*` color classes, and full styling for NavRail, Spotlight, and Cathedral. Existing v3 styles untouched.

### Files NOT modified

`src/App.tsx` is unchanged in Phase 2A. All routing for v3 still resolves through the Phase 1.5 `DashboardRouter` branch. The new keyboard shortcuts (⌘K, ⌘1/2/3) are scoped to the v3 shell via the `useNavOverlay` hook's `window.addEventListener` (cleanup on unmount), so they only fire when v3 is the active route.

### Route audit (real vs spec)

| Section | Spec route | Actual route used | Status |
|---|---|---|---|
| OMEGA | `/dashboard` | `/dashboard` | enabled, ⌘1 |
| Unified Inbox | `/inbox` | `/inbox` | enabled, ⌘2 |
| Clients (label) | `/clients` | `/customers` (real route) | enabled, ⌘3 |
| Sales AI | `/sales` | `/sales` (redirects to `/sales/dashboard`) | enabled |
| Marketing AI | `/marketing` | `/marketing` | enabled |
| HR AI | `/hr` | `/hr` (redirects to `/hr/dashboard`) | enabled |
| Operations | `/operations` | `/operations` (redirects to `/operations/inventory`) | enabled |
| Communications | `/comms` | `/communications` (real route) | enabled |
| Industry Verticals | `/industry` | (none) | **disabled** — "Coming soon" |
| Intelligence Layer | `/intel` | (none) | **disabled** — "Coming soon" |
| Analytics | `/analytics` | `/analytics` | enabled |
| Settings | `/settings` | `/settings` (redirects to `/settings/business-profile/company`) | enabled |

10 enabled, 2 disabled.

### Cathedral fade-out CSS

Spec called for fading `.omega-orb-stage` and `.omega-hero-text` — those classes don't exist in v3. The actual classes in `styles.css` are `.stage-canvas` (the WebGL canvas) and `.v3-wordmark` (the OMEGA serif text). The rule appended to `styles.css`:

```css
body.cathedral-open .omega-shell-v3 .stage-canvas,
body.cathedral-open .omega-shell-v3 .v3-wordmark {
  opacity: 0;
  transition: opacity 600ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
```

### Sacred zones — verified unchanged after Phase 2A

`git diff --stat` returned empty for: `src/components/omega/{NeuralBrain,NeuralBrainShell,agentRegistry,styles}.{tsx,ts,css}`, `src/pages/NeuralDashboard.tsx`, `src/components/omega/v3/ParticleSphere.tsx`, `src/pages/NeuralDashboardV3.tsx`, `src/App.tsx`, `Layout.tsx`, `OmegaFloatingChat.tsx`, `NavigationSidebar.tsx`, `ThemeToggle.tsx`, `webhooks.ts`, `supabase.ts`, `index.css`, `theme-fixes.css`, all configs, `src/hooks/`, `src/contexts/`.

### Build artifacts (Phase 2A)

| Chunk | Size | Notes |
|---|---:|---|
| `NeuralDashboardV3-*.js` | 23.0 kB (was 7.2 kB) | +15.8 kB for nav components |
| `NeuralDashboardV3-*.css` | 29.3 kB (was 18.1 kB) | +11.2 kB for nav styles |
| `three.module-*.js` | 459 kB | unchanged (still shared between v2 and v3) |
| `NeuralDashboard-*.js` (v2) | 23.5 kB | unchanged |

## Phase 2A.5 — Pulse Cathedral redesign

Added 2026-05-03. Cathedral renamed and redesigned as **Pulse**: light/colorful palette, layered card grid, live mini-dashboard metrics on each card (replacing marketing prose), knowledge gaps and competitor moves surfaced in red, premium effects (parallax tilt, breathing icon, count-up numbers, sword-light fallback border).

### What changed

- **"Your universe" → "Pulse"** with subtitle `live · across every department · across every layer`.
- **Light palette** scoped to `.pulse-cathedral`: pearl-white / pale-lavender / warm-cream tri-gradient background, deep-navy text. Defeats global theme overrides via a single `!important` on the container background.
- **12 cards in 3 layers**:
  - Operations · Doing — OMEGA, Sales AI, Marketing AI, HR AI, Operations, Communications
  - Intelligence · Knowing — Intelligence Layer, Industry Verticals
  - Reach · Connecting — Inbox, Clients, Analytics, Settings
- **No more "Coming soon"**. Intelligence Layer routes to `/settings/business-profile/knowledge` (the existing `KnowledgeBaseSettings` page); Industry Verticals routes to `/settings/business-profile/company` (the existing `CompanyInfoSettings` page).
- **Per-card colors** — every card has its own saturated hue (cyan/amber/rose/emerald/indigo/sky/violet/coral/plum/teal/gold/slate). Inline CSS variable `--card-color` drives icon, halo, sword-light edge, sparkline, metric numbers, and pill.
- **Cards show live metrics, not descriptions.** Each has a vertical list of 4-5 metrics (numeric value in card color + monospace label). Knowledge gaps + competitor moves render in red.
- **Premium effects** (all CSS-driven where possible, RAF-driven where needed):
  - Parallax tilt up to ±6° tracking the mouse, capped, springy on leave
  - Breathing icon — 2s opacity 0.7→1→0.7 loop
  - Count-up — values count from 0 → target over 800ms with `easeOutCubic`, staggered 40ms per card so they cascade in
  - Sword-light fallback — static colored 1px gradient border revealed on hover (full revolving conic gradient deferred for browser-compat safety per approval)
  - Always-on subtle gradient halo from each card's color
  - Smoothed upward sparkline at the bottom of each card
- **Hero stats fixed** — Phase 2A's invisible-numbers bug (light text on theme-overridden light bg) is fixed by binding `.pulse-cath-stat .val` color to `var(--pulse-ink)` inside the high-specificity `.pulse-cathedral` scope.

### Files modified (3 only)

| File | Diff | Notes |
|---|---|---|
| `src/components/omega/v3/nav/Cathedral.tsx` | full rewrite (140 → 290 lines) | New `<PulseCard>` subcomponent with parallax tilt + count-up + sparkline. Layered grouping by `PulseLayer`. Open/close mechanism, esc handling, body-scroll-lock effect all preserved. |
| `src/components/omega/v3/nav/sectionsRegistry.ts` | full rewrite (269 → 318 lines) | New `PulseSection` shape with `metrics: PulseMetric[]` and `layer`. `NavSection` and `NavColor` re-exported as type aliases for back-compat. `SPOTLIGHT_ROWS` minimally updated — added 3 new rows for Intelligence + Industry destinations. `CATHEDRAL_STATS` unchanged. |
| `src/components/omega/v3/styles.css` | +~390 appended lines | New `/* === PULSE CATHEDRAL (Phase 2A.5) === */` section. All selectors scoped under `.pulse-cathedral`. The Phase 2A `.v3-cathedral` / `.v3-cath-*` rules remain in place as dead-code fallback (no JSX uses those classes anymore — surgical, not destructive). |

### Files NOT modified (verified byte-identical via `git diff --stat`)

- All Phase 1 v2 files (`NeuralBrain.tsx`, `NeuralBrainShell.tsx`, `agentRegistry.ts`, `src/components/omega/styles.css`, `NeuralDashboard.tsx`)
- All Phase 1.5 files (`ParticleSphere.tsx`, `NeuralDashboardV3.tsx`)
- All Phase 2A files except Cathedral.tsx itself: `ParticleSphereShell.tsx`, `NavRail.tsx`, `Spotlight.tsx`, `useNavOverlay.ts`
- `src/App.tsx` — no routing change
- All system sacred files (`Layout.tsx`, `OmegaFloatingChat.tsx`, `NavigationSidebar.tsx`, `ThemeToggle.tsx`, `webhooks.ts`, `supabase.ts`, `index.css`, `theme-fixes.css`, all configs, `src/hooks/`, `src/contexts/`)

### Theme-conflict fix

The Phase 2A bug — hero stat numbers invisible in production — was light-on-light: text was `#f8fafc` on a cathedral background that some global theme override rendered light. Phase 2A.5 fix:

1. Container bg uses `!important` to defeat any global override:
   ```css
   .pulse-cathedral { background: linear-gradient(...) !important; }
   ```
2. All text colors inside the cathedral are bound to `var(--pulse-ink)` (deep navy `#0F172A`) — explicit dark color that wins regardless of any ambient light/dark theme.
3. High specificity (`.pulse-cathedral .pulse-cath-stat .val`) defeats single-class theme rules without needing additional `!important`s.

### Build artifacts

- `npm run build` passes in 23.95s, zero TS errors.
- `NeuralDashboardV3-*.js` chunk barely changed (logic still in same file boundaries).
- `NeuralDashboardV3-*.css` chunk grew with the appended Pulse styles.
- Three.js shared chunk unchanged.

## Phase 2B — Wire Pulse to real per-tenant Supabase data

Added 2026-05-04. Pulse cathedral metrics now reflect the logged-in tenant's actual data, with the Phase 2A.5 hardcoded values acting as a graceful fallback when a query fails or a column doesn't exist. Visual layout, premium effects (parallax tilt, breathing icon, count-up, sparklines, sword-light edge), and routing all unchanged.

### What changed

- New custom hook `usePulseData(isOpen)` fans out ~15 Supabase count queries in parallel (`Promise.allSettled`), with a 5s global timeout via `Promise.race`. Each successful query overlays its real value onto the `FALLBACK_SECTIONS` shape; failed queries silently keep the hardcoded value.
- `Cathedral.tsx` consumes the hook and feeds its existing `<PulseCard>` render path. The count-up animation reads from the merged `sections` state; if real data arrives within ~400ms (typical), the count-up animates straight to the real values.
- The "tenant industry" metric on the Industry card reads directly from `useTenant().tenantConfig?.industry` — no query, no roundtrip.
- The hook is debounced via `fetchedRef`: one fetch per `isOpen` flip. Opening and closing Pulse repeatedly does NOT hammer the database.

### Files added (1)

| File | Lines | Purpose |
|---|---|---|
| `src/components/omega/v3/nav/usePulseData.ts` | 322 | Custom hook. Consumes `useTenant()` for tenantId (SLUG) + tenantConfig.id (UUID) + tenantConfig.industry. Returns `{ sections, heroStats, loading, error }` matching the existing `PulseSection[]` and `CathedralStat[]` shapes. |

### Files modified (1, +5/-2 lines)

| File | Diff | Notes |
|---|---|---|
| `src/components/omega/v3/nav/Cathedral.tsx` | +5 / -2 | Removed `SECTIONS` + `CATHEDRAL_STATS` imports from `sectionsRegistry`. Added `usePulseData` import. Added one line at top of `Cathedral` component: `const { sections: SECTIONS, heroStats: CATHEDRAL_STATS } = usePulseData(isOpen);`. Render path unchanged. |

### Files NOT modified (verified byte-identical via `git diff --stat`)

- All Phase 2A nav (`NavRail.tsx`, `Spotlight.tsx`, `useNavOverlay.ts`, `sectionsRegistry.ts`)
- All Phase 1 v2 files, all Phase 1.5 files, Phase 2A `ParticleSphereShell.tsx`
- Phase 2A.5 `styles.css` — zero new styles needed
- All system sacred files (`Layout.tsx`, `OmegaFloatingChat.tsx`, `NavigationSidebar.tsx`, `ThemeToggle.tsx`, `webhooks.ts`, `supabase.ts`, `index.css`, `theme-fixes.css`, configs, `src/hooks/`, `src/contexts/`)
- `src/App.tsx` — no routing change, no new lazy imports

### Per-table tenant_id format (verified from existing code, see Phase 2B investigation)

| Table | format | Verified at |
|---|---|---|
| `customers` | SLUG | `useAnalytics.ts:74` |
| `sales_leads` | SLUG | `useAnalytics.ts:236` |
| `appointments` | SLUG | `useAnalytics.ts:78` |
| `conversations` | UUID (with SLUG fallback) | `useAnalytics.ts:76-77` |
| `outbound_messages` | SLUG | `SMS.tsx:73`, `Email.tsx:65` |
| `campaigns` | SLUG | `useCampaigns.ts:53` |
| `tenant_integrations` | SLUG | `useIntegrations.ts:43` |
| `estimation_projects` | SLUG | per `CLAUDE.md` + `ProjectDetail.tsx` |
| `social_posts` | UUID | `useSocialPosts.ts:55` |
| `competitor_tracking` | UUID | `marketing/Analytics.tsx:52` |

### Real vs hardcoded — final tally per card

| Card | Real queries | Hardcoded |
|---|---|---|
| OMEGA | 0 | 4 (system constants) |
| Sales AI | 3 (in pipeline, hot leads ≥75, contacted today) | 2 (sequences, ARR) |
| Marketing AI | 2 (campaigns live, posts this week) | 3 |
| HR AI | 0 | 4 (no clean table mapping) |
| Operations | 2 (active projects, estimates pending) | 2 |
| Communications | 2 (WhatsApp chats 24h, emails sent 24h) | 2 |
| Intelligence Layer | 0 | 5 (no knowledge tables found) |
| Industry Verticals | 3 (tenant industry from config, competitors tracked, moves this week) | 2 (benchmarks) |
| Unified Inbox | 1 (open conversations) | 3 |
| Clients | 2 (total, today) | 2 (active, NPS) |
| Analytics | 0 | 4 (system metrics) |
| Settings | 1 (integrations connected) | 3 (static labels) |
| **Hero stats** | 3 (active leads, conversations, booked appointments) | 1 (agents healthy 88/88) |

**Total: ~19 real queries · ~30 hardcoded fallbacks.**

### Multi-tenant safety

- Every query has explicit `.eq('tenant_id', X)` — never relies on RLS alone.
- `tenant_id` value chosen per-table from the verified mapping above (UUID for `conversations` / `social_posts` / `competitor_tracking`; SLUG for everything else).
- `Promise.allSettled` — one failed query never cascades; missing values fall back to hardcoded.
- 5s global timeout via `Promise.race` — Pulse never blocks on a slow Supabase round-trip.
- `fetchedRef` debounces — one fetch per `isOpen` flip.
- Read-only. Zero writes, zero schema changes, zero RLS policy changes, zero n8n calls.
- New tenants with empty tables return count `0` and Pulse shows `0` — not a crash, not the hardcoded fallback (since `0 !== null`).

### Speculative columns (graceful fallback if absent)

| Query | Speculative column | Behavior if missing |
|---|---|---|
| `sales_leads` "contacted today" | `last_contact_at` | Falls back to hardcoded "12" |
| `conversations` "WhatsApp chats" | `last_message_at` | Falls back to hardcoded "47" |
| `competitor_tracking` "moves this week" | `updated_at` | Falls back to hardcoded "3 alerts" |
| `tenant_integrations` "connected" | `status='connected'` | Falls back to hardcoded "22" |

If any column is wrong, `console.warn` logs the specific failure and the metric silently falls back. No user-visible breakage.

### Build artifacts

- `npm run build` passes in 49.32s, zero TS errors.
- No new dependencies.
- Module size delta: `usePulseData.ts` adds ~322 lines / ~10 kB to the lazy-loaded `NeuralDashboardV3-*.js` chunk.

## Phase 2B.1 — full pulse data introspection + top bar fix

Added 2026-05-04. Two issues from the Phase 2B live test:

1. v3 top bar showed `ZATE SYSTEMS · tenant · zateceptionist` regardless of which tenant was logged in. Real bug.
2. Hardcoded fake values like `47 sequences active`, `$1.2M ARR`, `1.2k IG followers`, `12 calls today` sat next to real-zero values like `0 in pipeline`, looking inconsistent.

### What changed

**Top bar fix.** `ParticleSphereShell.tsx` now reads `useTenant()` and derives:
- `businessName = tenantConfig?.company_name ?? tenantId.toUpperCase() ?? "OMEGA"`
- `tenantLabel = tenantId ?? "guest"`
- `markLetter = businessName[0]`

Three text nodes swapped: `<div className="mark">Z</div>` → `{markLetter}`; `ZATE SYSTEMS` → `{businessName.toUpperCase()}`; `tenant · zateceptionist` → `tenant · {tenantLabel}`.

**Data introspection — broader table sweep.** A comprehensive `grep -hEo '\.from\(['\"][a-z_]+['\"]\)' src/` returned 110+ unique tables. Cross-referenced with the existing per-table `tenant_id` patterns to discover tables Phase 2B missed:

| Newly wired in Phase 2B.1 | Format | Source | Metric |
|---|---|---|---|
| `sequences` | SLUG | `sales/Analytics.tsx:114` | sales **sequences active** (`is_active=true`) |
| `voice_usage` | SLUG | `VoiceCallLog.tsx:93`, `Dashboard.tsx:110` | comms **calls today** (`created_at >= 24h`) |
| `hr_candidates` | UUID | `useRecruitment.ts:370` | hr **onboarding** (speculative `status='onboarding'`) |
| `hr_performance_reviews` | UUID | `useHR.ts:524` | hr **reviews due** (speculative `status='pending'`) |
| `ltv_cac_snapshots` | SLUG | `useLtvCac.ts:89` | sales **ARR managed** (best-effort `arr` column → formatted `$1.2M`) |

**Derived from `tenantConfig` — no Supabase query.** The Inbox card "channels active" metric is now real per-tenant, computed from the boolean flags `has_whatsapp + has_email + has_voice + has_instagram + has_facebook + has_linkedin`. Always succeeds when tenantConfig is loaded.

**`notConfigured` sentinel for genuinely unwireable metrics.** New optional field on `PulseMetric`:

```ts
notConfigured?: boolean;
```

When `true`, the renderer shows `—` plus a small italic *not configured* hint (inline-styled) instead of a number. The flag is set in two places:

1. **At rest** (`sectionsRegistry.ts`) for metrics with no real data source — IG followers, engagement %, open roles, team capacity, dispatches today, SLA met, all 5 Intelligence Layer metrics, lead velocity, pipeline volume, hot threads, awaiting response, active accounts, avg NPS, events / hr, datapoints. Total: 21 metrics marked.
2. **Per-query outcome** (`usePulseData.ts` — Phase 2B.1 change). When a query was attempted and failed (column missing, RLS denial, network), the merger now flips `notConfigured: true` on that metric instead of silently keeping the registry's hardcoded fallback. This converts Phase 2B's silent fallback into an explicit "—" so users never see a fake-but-failed number.

**Successful query → `notConfigured: false`.** `applyUpdates` now clears `notConfigured` whenever a query returns a real value (including 0 — distinguishing "real empty" from "not configured" remains preserved).

### System constants — kept hardcoded, NOT marked `notConfigured`

These are facts about the OMEGA architecture, identical across all tenants — not "fake per-tenant numbers":

- OMEGA card: 79 tools active, 12 core agents, 4 LangGraph brains, 99.9% uptime
- Communications card: 41 VAPI tools
- Analytics card: 14 dashboards, "live" streaming label
- Settings card: "Knowledge base managed", "AI training active", "Company info configured" (status descriptors, not numbers)
- Hero stats: 88/88 agents healthy

### Files modified (4)

| File | Diff | Notes |
|---|---|---|
| `src/components/omega/v3/ParticleSphereShell.tsx` | +12/-5 | New `useTenant()` import + 3 derived values + 3 text-node swaps. All other markup byte-identical. |
| `src/components/omega/v3/nav/sectionsRegistry.ts` | +14/-5 | Added `notConfigured?: boolean` to `PulseMetric` type. Marked 21 unwireable metrics. |
| `src/components/omega/v3/nav/usePulseData.ts` | +130/-15 | Widened `MetricUpdate` type. Added 5 new queries (sequences, voice_usage, hr_candidates, hr_performance_reviews, ltv_cac_snapshots ARR). Added `deriveChannelsActive()` (no-query derivation from tenantConfig). Result-processing loop now flips `notConfigured: true` on null outcome. `applyUpdates` clears `notConfigured` on success. |
| `src/components/omega/v3/nav/Cathedral.tsx` | +44/-7 | Conditional rendering: `if (m.notConfigured)` → render `—` + italic hint via inline `style={{}}`. Else: existing CountUpValue render. No `styles.css` edit. |

### Files NOT modified (verified byte-identical via `git diff --stat`)

- All Phase 2A nav (`NavRail`, `Spotlight`, `useNavOverlay`)
- All Phase 1 v2 + Phase 1.5 + Phase 2A.5 `styles.css`
- All system sacred (`Layout`, `OmegaFloatingChat`, `NavigationSidebar`, `ThemeToggle`, `webhooks`, `supabase`, `index.css`, `theme-fixes.css`, configs, `src/hooks/`, `src/contexts/`)
- `App.tsx` — no routing change

### Multi-tenant safety

- Every new query has explicit `.eq('tenant_id', X)` with verified per-table format.
- `Promise.allSettled` + 5s timeout — failures don't cascade.
- ARR query uses `.maybeSingle()` so missing rows don't throw.
- Channels-active derivation reads only from already-fetched tenantConfig — no extra query, no risk.
- Speculative columns (`hr_candidates.status='onboarding'`, `hr_performance_reviews.status='pending'`, `ltv_cac_snapshots.arr`) fall back to `notConfigured: true` rather than silent hardcoded values, per the new policy.

### Behavior matrix

| State | What user sees |
|---|---|
| Logged in, query succeeds, value ≥ 0 | Real number, count-up animation |
| Logged in, query returns `null` (column missing / RLS denied) | "—" + italic *not configured* |
| Logged in, query attempted, returns `0` (real empty) | "0", count-up animation |
| Logged out / no tenant | Registry fallback (notConfigured already true on unwireable metrics) |
| Tenant context loading | Registry fallback briefly, then real values when fetch completes |

### Build artifacts

- `npm run build` passes in 38.45s, zero TS errors, zero new dependencies.
- App boot verified clean on `/login` — zero console errors, all 4 modified modules served at 200.
- Live test (you logging into different tenants) will surface per-query outcomes via `[Pulse] *` warn lines in the browser console.

## Phase 4 — Pulse becomes the default for /dashboard

Shipped 2026-05-04. v3 (Pulse) is now the default UI for every tenant on `/dashboard`. The legacy Dashboard remains accessible via `?ui=legacy` for per-device rollback.

### What changed

A single 3-line edit to `DashboardRouter` in `src/App.tsx`:

```diff
 function DashboardRouter() {
   const params = new URLSearchParams(window.location.search);
+  // Phase 4: v3 (Pulse) is now the default for /dashboard. ?ui=legacy is the
+  // per-device rollback flag. ?ui=v2 / ?ui=v3 still resolve for old bookmarks.
+  if (params.get("ui") === "legacy") return <Dashboard />;
   if (params.get("ui") === "v2") return <NeuralDashboard />;
   if (params.get("ui") === "v3") return <NeuralDashboardV3 />;
-  return <Dashboard />;
+  return <NeuralDashboardV3 />;
 }
```

### URL contract

| URL | Behavior |
|---|---|
| `/dashboard` | **Pulse (v3) — new default for all tenants** |
| `/dashboard?ui=legacy` | **Old Dashboard.tsx — per-device rollback** |
| `/dashboard?ui=v2` | Neural Brain (Phase 1, JARVIS-style) |
| `/dashboard?ui=v3` | Pulse (kept for backward compatibility — old bookmarks still work) |

### Mobile decision

**Phase 4b posture (all viewports → v3).** No `matchMedia` fallback. Reasoning:
- WebGL supported on ~97% of modern phones
- Splitting UIs creates maintenance debt
- `?ui=legacy` is the per-device escape hatch — any user with a struggling phone can revert with one URL change
- CSS already has `@media (max-width: 760px)` adaptations for the cathedral layout

If real-world mobile complaints surface post-deploy, a Phase 4.5 hotfix can add `if (window.matchMedia("(max-width: 768px)").matches) return <Dashboard />;` to the router.

### Loading state

**Skipped — no code change.** First paint shows the shell chrome (top bar, OMEGA wordmark, mic, rail) immediately; the WebGL sphere materializes ~200-400ms later inside the already-visible shell. This natural progression is graceful — adding a fade-in would slow first paint without improving the UX.

### Rollback procedures

1. **Per-device rollback (any user)** — append `?ui=legacy` to the `/dashboard` URL. The user immediately sees the old Card-based stats dashboard. Bookmarkable, shareable.
2. **Per-tenant rollback** — not implemented in Phase 4. If a specific tenant needs to be force-routed to legacy, it would require a tenantConfig flag check in DashboardRouter (Phase 4.5+ if needed).
3. **Global rollback** — `git revert HEAD` on the App.tsx commit, push to GitHub, Lovable Publish. Returns the default route to legacy Dashboard for everyone within ~60 seconds. The v3 routes (`?ui=v3`, `?ui=v2`) remain available as opt-in.

### Known limitations (deferred to Phase 5)

The v3 NavRail (4 icons) + Spotlight (~25 rows) cover most destinations, but the following routes are accessible only via direct URL until Phase 5 expands navigation:

- **Universal pages missing from rail + Spotlight:** `/tasks`, `/appointments`, `/services`
- **Industry-conditional pages** (only matter for those tenants): `/clinic/*`, `/estimation/*`, `/collections/*`, `/youtube/*`, `/realestate/*`, `/roofing/*`, `/tenders/*`
- **Admin pages** (master_admin only): `/admin/*`

Phase 5 will add Tasks/Appointments/Services to Spotlight quick actions and introduce a rail "More" menu that surfaces industry-conditional routes based on `tenantConfig.industry`.

### Files modified (1)

| File | Diff | Notes |
|---|---|---|
| `src/App.tsx` | +4 / -1 | DashboardRouter swap. All other lazy imports + routes byte-identical. |

### Files NOT modified (verified byte-identical via `git diff --stat`)

- All Phase 1/1.5/2A/2A.5/2B/2B.1 files
- `src/pages/Dashboard.tsx` (legacy — must remain functional via `?ui=legacy`)
- All system sacred files (`Layout`, `OmegaFloatingChat`, `NavigationSidebar`, `ThemeToggle`, `webhooks`, `supabase`, `index.css`, `theme-fixes.css`, configs, `src/hooks/`, `src/contexts/`)

### Build artifacts

- `npm run build` passes in 24.82s, zero TS errors, zero new dependencies.
- App boot verified clean — `/login` renders, `/dashboard` correctly redirects unauthenticated to `/login` through the new routing.
- All 4 module paths (App.tsx, Dashboard.tsx, NeuralDashboard.tsx, NeuralDashboardV3.tsx) served by Vite at 200.

### Multi-tenant safety

- Zero schema/RLS/n8n/VAPI/LangGraph changes.
- Every tenant gets v3 with their own real per-tenant data (proven in Phase 2B + 2B.1).
- Top bar reads `useTenant()` (Phase 2B.1) — already verified to flip per tenant.
- Pulse cathedral data scoped per tenant via Phase 2B's verified `.eq('tenant_id', X)` patterns.
- `?ui=legacy` provides immediate fallback for any tenant who reports issues.

## Phase 5 — V3 chrome unification (Tier 1 routes)

Shipped 2026-05-05. Five Tier 1 routes now render under v3 chrome (rail + slim top bar + ⌘K Spotlight + Cathedral) without changing any page content. Tier 2/3 routes keep their existing Layout chrome. Phase 5 is targeted unification, not a full migration.

### Tier 1 routes migrated to V3Layout

| Route | Page (unchanged) |
|---|---|
| `/dashboard` | `DashboardRouter` → `NeuralDashboardV3` (Pulse) |
| `/inbox` | `InboxPage` |
| `/customers` | `CustomersPage` |
| `/sales/dashboard` | `SalesDashboard` |
| `/marketing` | `MarketingHub` |

All other ~95 protected routes remain under the existing `<Layout />` parent — byte-identical chrome, byte-identical behavior.

### Architecture decisions

**Q1 — Marketing route:** `/marketing` (no `/dashboard` suffix). Spec said "/marketing/dashboard" but only `/marketing` exists in App.tsx (renders `MarketingHub`). Used the actual route.

**Q2 — Top-bar de-duplication:** Option B. V3Layout reads `useLocation()` and skips its own top bar when `pathname === '/dashboard'`. ParticleSphereShell continues rendering its own top bar there. Sacred file untouched.

**Q3 — Route restructuring:** Option α. New `<Route element={<ProtectedRoute><V3Layout /></ProtectedRoute>}>` parent inserted BEFORE the existing `<Layout />` parent in App.tsx. Five Tier 1 routes moved into the new parent. React Router matches the first matching parent, so the new parent wins for those 5 paths and the old parent serves everything else.

**`?ui=legacy` bypass:** V3Layout itself reads `URLSearchParams` and returns `<Layout />` instead of rendering v3 chrome when `?ui=legacy` is present. Per-device escape hatch for any tenant who hits issues with the new Tier 1 chrome — works on any V3Layout-wrapped route, not just `/dashboard`.

### Files created (2)

| Path | Lines | Notes |
|---|---|---|
| `src/components/v3/V3Layout.tsx` | 174 | Mirrors Layout.tsx auth/onboarding gates exactly. Renders `NavRail` (always), top bar (skipped on `/dashboard`), `<Outlet />`, `Spotlight`, `Cathedral`, `OmegaFloatingChat` (skipped on `/dashboard`), `BottomTabBar`, `InstallPrompt`, `OnboardingFlow`. Wraps in inline `V3MobileErrorBoundary` (separate class — not Layout's). `?ui=legacy` returns `<Layout />` directly. |
| `src/components/v3/V3Layout.css` | 115 | Scoped under `.v3-layout-*` — no collision with `omega/v3/styles.css` (which is scoped `.omega-shell-v3`). Top bar fixed at `top:0; left:64px; height:48px`. Main padding-left 64px (rail) + padding-top 60px (top bar). Mobile breakpoint at `760px` shrinks rail/topbar. On `/dashboard`, padding collapses to 0 so ParticleSphereShell can take full viewport. |

### Files modified (1)

`src/App.tsx` — `+33 / -22`:
- Added eager import: `import V3Layout from "./components/v3/V3Layout";`
- Inserted new `<Route element={<ProtectedRoute><V3Layout /></ProtectedRoute>}>` parent BEFORE existing Layout parent
- Moved 5 route blocks into the new parent: `/dashboard`, `/customers`, `/inbox`, `/sales/dashboard`, `/marketing`
- Deleted those 5 routes from the existing Layout parent (replaced with single-line comments noting the move)
- All other ~95 routes byte-identical wrapping

### Files NOT modified (verified byte-identical via `git diff --stat`)

- `Layout.tsx`, `OmegaFloatingChat.tsx`, `NavigationSidebar.tsx`, `ThemeToggle.tsx`, `BottomTabBar.tsx`, `InstallPrompt.tsx`, `OnboardingFlow.tsx`
- `webhooks.ts`, `supabase.ts`, `theme-fixes.css`, `index.css`, all configs
- All `src/hooks/`, `src/contexts/`
- All Phase 1-4 v3 files: `NeuralBrain`, `NeuralBrainShell`, `agentRegistry`, `omega/styles.css`, `NeuralDashboard`, `ParticleSphere`, `ParticleSphereShell`, `v3/styles.css`, `NeuralDashboardV3`, `NavRail`, `Spotlight`, `useNavOverlay`, `sectionsRegistry`, `usePulseData`, `Cathedral`
- All existing pages: `Dashboard.tsx`, `Inbox.tsx`, `Customers.tsx`, `pages/sales/Dashboard.tsx`, `MarketingEngine.tsx`

### URL contract after Phase 5

| URL | Chrome | Page |
|---|---|---|
| `/dashboard` | V3Layout (top bar skipped — sphere shell renders its own) | Pulse / NeuralDashboardV3 |
| `/dashboard?ui=legacy` | Layout (V3Layout delegates) | Dashboard.tsx (old) |
| `/dashboard?ui=v2` | V3Layout | Neural Brain (Phase 1, full-viewport — same skip-topbar applies) |
| `/inbox` | V3Layout | InboxPage |
| `/inbox?ui=legacy` | Layout (V3Layout delegates) | InboxPage |
| `/customers` | V3Layout | CustomersPage |
| `/sales/dashboard` | V3Layout | SalesDashboard |
| `/marketing` | V3Layout | MarketingHub |
| `/sales/leads`, `/sales/pipeline`, `/sales/sequences`, etc. | Layout (unchanged) | unchanged |
| `/hr/*`, `/operations/*`, `/marketing/content`, etc. | Layout (unchanged) | unchanged |
| All other ~95 routes | Layout (unchanged) | unchanged |

### Multi-tenant safety

- V3Layout consumes `useTenant()` only for top bar display (mirrors Phase 2B.1's pattern in ParticleSphereShell). No new Supabase queries.
- Per-tenant `tenantConfig.primary_color` injected as `--primary` CSS var, mirroring Layout.tsx behavior.
- Auth gates mirrored exactly: `useAuth()` + `useTenant()` loading + `!user` redirect to `/login` + `onboarding_completed === false` redirect to `/onboarding`.
- Zero schema/RLS/n8n/agent/VAPI changes.

### Rollback procedures

| Scope | Procedure |
|---|---|
| Per-device | Append `?ui=legacy` to any Tier 1 URL — V3Layout delegates to old Layout. Bookmarkable, shareable. |
| Per-route | Move that route's block from the V3Layout parent back to the Layout parent in App.tsx. One-line move. |
| Global | `git revert HEAD` on the App.tsx commit + delete `src/components/v3/V3Layout.{tsx,css}` → push → Lovable Publish. Returns all 5 Tier 1 routes to old Layout for everyone within ~60s. |

### Build

`npm run build` passes in 23.25s, zero TS errors, zero new dependencies. App boots clean on `/login`, V3Layout module + CSS served by Vite at 200, zero console errors.

### Known limitations (deferred to future)

- NavRail still has only 4 icons — Tasks / Appointments / Services + industry-conditional routes still accessible only via direct URL or Spotlight (Phase 5 didn't expand the rail; the chrome unification was the focus).
- Tier 2/3 routes still use the old NavigationSidebar. Cross-chrome navigation (e.g. Inbox v3 → click "Sequences" → lands in old chrome) is acceptable but jarring. Future phases can promote more routes to V3Layout.

## Out of scope (future)

- Phase 5.1 (only if needed): rollback per route or per tenant
- Phase 6: extend NavRail + Spotlight to cover Tasks, Appointments, Services, and industry-conditional routes; promote more pages to V3Layout
- Phase 2C: wire mic button to real OMEGA backend (`OmegaFloatingChat.sendMessage` extraction into a `useOmegaChat` hook)
- Schema work to populate the currently-`notConfigured` metrics:
  - `tenant_kb_entries` / knowledge tables (Intelligence Layer)
  - `hiring_requisitions` / `job_openings` (HR open roles)
  - Marketing attribution pipeline (leads from blog, IG followers, engagement %)
  - SLA + dispatch metrics (Operations)
  - Industry benchmark snapshots (lead velocity, pipeline volume Top X%)
  - NPS aggregation (Clients)
  - Analytics events-per-hour stream
- Real agent registry data in v2 (currently 70-agent placeholder)
- Tenant-aware sphere coloring
- Full revolving conic-gradient sword-light edge (deferred from Phase 2A.5 for browser-compat — fallback static gradient ships now)
