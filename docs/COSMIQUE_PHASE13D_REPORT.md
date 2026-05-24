# Cosmique — Phase 13.D: Submenu Expansion — Evidence-First Root Cause + Surgical CSS Fix

**Date:** 2026-05-24
**User report:** On real iOS device after Phase 13.A + 13.B + 13.C all deployed, tapping SALES AI / MARKETING AI / HR AI / OPERATIONS / COMMUNICATIONS rows in the mobile drawer does **nothing**. Submenus never expand.
**Approach:** No more guessing. Runtime DOM evidence gathered via Playwright before proposing a fix.

---

## TL;DR

| | |
|---|---|
| Failure mode classification | **MODE B** — event reaches DOM but Radix's onOpenToggle doesn't fire when click event target IS the outer button |
| Fix path chosen | **PATH A** (pure CSS additive). No sacred-file edit. |
| Sacred files touched | 0 |
| Commit | `246fc8a` pushed to `origin/main` |
| Deploy status | 🟡 **CSS DEPLOY_PENDING** — bundle rebuilt (`index-B-d6fbZ0.js`, CSS `index-CX8K4VmW.css`) but new rule not yet present in deployed CSS — Lovable in-flight |

---

## Evidence (Phase 13.D diagnostic spec — `cosmique-phase13d-dispatch.spec.ts`)

The Phase 13.C edit removed `asChild` so CollapsibleTrigger renders a native `<button>`. Theory said clicks on the button should fire Radix's `onOpenToggle`. **Evidence proved otherwise:**

```json
{
  "before": "closed",                          ← initial data-state on button
  "dispatched_on_OUTER_BUTTON": true,          ← MouseEvent('click') successfully dispatched
  "after_sync": "closed",                      ← state did NOT change
  "afterAsync": "closed",                      ← still unchanged after 500ms
  "dispatched_on_INNER_DIV": { "ok": true },   ← then dispatched on inner SidebarGroupLabel
  "afterInnerClick": "open"                    ← STATE FLIPPED to open ✓
}
```

**Bubble-up from a child element fires Radix's onClick correctly. Events directly targeting the button DO NOT.** This is reproducible in headless chromium and mirrors what the user reports on real iOS: taps that land directly on the button's "bare" surface (the 12-pixel strip below the inner div, created by Phase 13.C's `min-h-[44px]`) don't trigger anything.

### Other captured DOM facts

```json
{
  "tagName": "BUTTON",
  "computedTouchAction": "auto",     ← button itself has no touch-action: manipulation
  "computedCursor": "pointer",       ← inherited
  "computedMinHeight": "44px",       ← Phase 13.C/B working
  "computedHeight": "44px",
  "pointerEvents": "auto",
  "firstChildAttrs": {
    "tag": "DIV",
    "dataSidebar": "group-label",
    "cursor": "pointer",             ← inner div cursor: pointer (from shadcn className)
    "touchAction": "auto"            ← also lacks touch-action: manipulation
  },
  "preSiblingContent": {
    "contentDataState": "closed",
    "contentDisplay": "none",
    "contentInnerHTMLLen": 0        ← Radix Collapsible renders empty content when closed (expected)
  },
  "drawerStillOpenAfterClick": true, ← Mode C ruled out (drawer didn't close)
  "urlChanged": false                ← Mode C route-change ruled out
}
```

### Static analysis cross-checks (Step 13.D.1)

- `NavigationSidebar.tsx:176-186` — click-outside listener resets `openSections={}` on mousedown outside `[data-sidebar]`. Inspected; on mobile the Sheet's SidebarContent has `data-sidebar="sidebar"`, so taps inside the drawer are inside the matched element. Not the cause.
- `NavigationSidebar.tsx:223-225` — `toggleSection(key)` uses functional `setOpenSections(prev => …)`. Correct React idiom.
- `NavigationSidebar.tsx:192-214` — auto-expand useEffect only depends on `location.pathname`. Not triggered by clicks.
- `NavigationSidebar.tsx:217-221` — auto-close drawer effect runs on pathname change. Not the cause (URL didn't change per evidence).

The static analysis cleared every hypothesis. The DOM dispatch evidence was definitive.

---

## Why this happens (mechanism)

Phase 13.C changed `<CollapsibleTrigger asChild>` to `<CollapsibleTrigger className="…min-h-[44px]…">`:
- CollapsibleTrigger renders its native `<button>` (Radix Primitive)
- Button is 44px tall on mobile (Tailwind `min-h-[44px]`)
- Inner `<SidebarGroupLabel>` div is still `h-8` (32px) from shadcn defaults
- **12px gap between inner div's bottom and button's bottom — "button-only" surface area**

Radix Collapsible's onClick wiring on the button SHOULD fire on any click anywhere inside the button, including the 12px strip. But empirical evidence shows that in this Radix + Sheet + asChild-removed configuration, **events whose target IS the button element directly don't trigger Radix's onOpenToggle**. Only events that bubble up from a child do. This is a Radix-specific quirk (possibly related to how it wires onClick via `composeEventHandlers` in the no-asChild path).

On iOS Safari, taps in the 12px strip land directly on the button → don't fire. Real users see "nothing happens."

---

## Path A — pure CSS additive fix (no sacred edit)

Updated `src/index.css` within existing `@media (max-width: 767px)` block:

```css
@media (max-width: 767px) {
  [data-sidebar="menu-button"] { min-height: 44px; }
  [data-sidebar="group-label"][data-state] { min-height: 44px; touch-action: manipulation; cursor: pointer; }

  /* Phase 13.D — stretch the inner SidebarGroupLabel div to fill the 44px
     CollapsibleTrigger button. Eliminates the "button-only" tap zone that
     iOS sends as direct button events (which Radix doesn't toggle from
     in this configuration — proved via Phase 13.D dispatch evidence). */
  button[data-state] > [data-sidebar="group-label"] {
    min-height: 44px;
    height: 100%;
    width: 100%;
    touch-action: manipulation;
  }
}
```

**Net effect:** the inner div now fills the entire 44px button area. Every tap inside the button's bounding box lands on the inner div, fires a click event there, and bubbles up to the button — which triggers Radix's onOpenToggle correctly (proven by `afterInnerClick: "open"` in evidence).

`touch-action: manipulation` on the div eliminates the iOS 300ms tap delay AND prevents double-tap zoom interference with click synthesis.

NavigationSidebar.tsx + ui/sidebar.tsx + Layout.tsx + Header.tsx all UNTOUCHED. Phases 13.A + 13.B + 13.C edits all intact.

---

## Deploy status: 🟡 DEPLOY_PENDING

- ✅ Source pushed (`246fc8a`)
- ✅ Bundle rebuilt: `index-BBfE2vXY.js` → `index-B-d6fbZ0.js`
- ✅ CSS rotated: `index-C8smAtq6.css` → `index-CX8K4VmW.css`
- ❌ **Verified via REST**: the deployed CSS does NOT yet contain `button[data-state] > [data-sidebar="group-label"]`. The Lovable rebuild that produced `CX8K4VmW.css` was from a slightly earlier commit; the next rebuild will include Phase 13.D.

Once Lovable Publish completes for commit `246fc8a`:
- Real-iPhone taps on any section row will register reliably
- Section expands on tap (`data-state` flips from "closed" → "open")
- Tap again closes
- 13B.C Playwright tests should also flip from BROKEN_UI → REAL_PASS

---

## Multi-tenant impact

Zero. The CSS rule is media-query-gated to mobile viewports and targets the universal sidebar structure. All 17 tenants get the fix automatically when their mobile users tap a section trigger. The rule selector is tenant-agnostic — no industry-specific code path involved.

---

## Required user actions

1. **Trigger Lovable Publish** for commit `246fc8a` to push `button[data-state] > [data-sidebar="group-label"]` rule to production CSS.
2. **Real-device retest** on iPhone or Android (same procedure as before): open `ai.zatesystems.com` → tap hamburger → tap SALES AI / MARKETING AI / etc. → confirm section expands.
3. If section STILL doesn't expand after Publish: that points to a Radix Collapsible primitive issue we'd need to investigate (Phase 13.E would be a sacred edit OR upgrade Radix). Don't pre-build for that — only escalate on evidence.

---

## Revert plan

If anything regresses post-deploy:

```bash
# Remove the 7 lines added in src/index.css Phase 13.D block, leave Phase 13.B intact
git revert 246fc8a
git push
```

No sacred files involved — straightforward CSS-only revert.

---

## Files

**Edited (1, additive CSS only):**
- `src/index.css` — added 7-line rule inside existing mobile media query block

**Created (diagnostic evidence):**
- `tests/cosmique-phase13d-diagnose.spec.ts` — captures full DOM state + computed styles before/after click
- `tests/cosmique-phase13d-dispatch.spec.ts` — dispatches click on outer button vs inner div, proves bubble-up works but direct doesn't
- `tests/phase13d-diagnose.json` — raw evidence
- `tests/screenshots/phase13d/{pre,post}-click.png` — visual evidence

**Not touched (sacred):**
- `src/components/NavigationSidebar.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/Layout.tsx`
- `src/components/layout/Header.tsx`

---

## Phase 13 cumulative

| Phase | Surface | Status | Sacred edits |
|---|---|---|---|
| 13.A | Header.tsx hamburger | ✅ live | 0 |
| 13.B | index.css 44px on `[data-sidebar="group-label"][data-state]` (pre-13.C selector) | ✅ live | 0 |
| 13.C | NavigationSidebar.tsx line 854 (asChild → className) | ✅ live | 1 line, USER-APPROVED |
| **13.D** | index.css 44px stretch on `button[data-state] > [data-sidebar="group-label"]` (post-13.C selector) | 🟡 deploy-pending | 0 |

---

## Commit
- `246fc8a` — Phase 13.D pure-CSS additive fix + diagnostic evidence specs
