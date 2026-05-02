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

## Out of scope (future)

- Phase 2: wire mic button to real OMEGA backend (`OmegaFloatingChat.sendMessage` extraction into a `useOmegaChat` hook)
- Real telemetry counters in top bar
- Real agent registry data (currently 70-agent placeholder)
- Tenant-aware coloring or content
