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

## Out of scope (future)

- Phase 2B: wire mic button to real OMEGA backend (`OmegaFloatingChat.sendMessage` extraction into a `useOmegaChat` hook); wire Cathedral stat cards + section pills to live data
- Real telemetry counters in top bar
- Real agent registry data (currently 70-agent placeholder)
- Tenant-aware coloring or content
- Industry + Intelligence section pages (currently "Coming soon")
