# bsh-intelligence-owa — Phase 2F

Bahmni-OWA-compatible (Angular 1.x) overlay that connects clinical screens
to the 420 LangGraph brain (OMEGA + MEDICA + agent tools).

## Structure
- `index.html` — shell with industry-guard error fallback + app root
- `manifest.webapp` — Bahmni OWA descriptor
- `scripts/services/industry-guard.js` — runs on mount; hides app if industry != healthcare_hospital
- `scripts/services/zate-api.js` — REST client for 420 OMEGA + MEDICA + metrics
- `scripts/controllers/dashboard.js` — dashboard controller
- `scripts/app.js` — Angular module bootstrap
- `styles/zate-theme.css` — whitelabel theme

## Industry-gate (browser side)

`IndustryGuard.check()` calls `GET /api/tenant-config?probe=industry`. If the
response says `healthcare_hospital`, the app renders. Otherwise the friendly
error block is shown and the app is hidden.

This is the third layer of defense (tools + n8n workflows + services already
gate server-side; this hides UI for the same gate condition).

## Install in Bahmni

The OWA loads at `/openmrs/owa/bsh-intelligence/` after copy:
```bash
mkdir -p /var/lib/OpenMRS/owa/
cp -r bsh-intelligence-owa /var/lib/OpenMRS/owa/bsh-intelligence
```

## Verification

| Check | Verdict |
|---|---|
| Angular bootstrap order | [VERIFIED-CODE] — guard runs in `.run()` before controllers |
| Industry-gate fail-safe | [VERIFIED-CODE] — on error, defaults to hiding app (no leak) |
| `withCredentials: true` everywhere | [VERIFIED-CODE] — JWT/session cookie travel with each call |
| Live Bahmni OWA load | [DEFERRED-AMD] — Bahmni not deployed |
| Browser Playwright UI test | [DEFERRED-AMD] |
