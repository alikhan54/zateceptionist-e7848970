# bsh-bahmni-config — Phase 2F

BSH-specific Bahmni configuration overrides. Mounted as a Docker volume into
the Bahmni containers via `BAHMNI_CONFIG_PATH` env var.

This is **configuration only — no compiled code**, no derivative work
under AGPL.

## Layout
```
bahmni-config/
├── openmrs/
│   ├── apps/
│   │   ├── registration/        BSH HN identifier format + corporate flag
│   │   ├── clinical/            Per-department consultation forms (Cardiology, Oncology, ...)
│   │   └── reports/             BSH letterhead + MIS report templates
│   └── concepts/                Lab panels + drug formulary (BD)
├── openelis/
│   └── test-catalog.json        BSH lab catalog
├── odoo/
│   └── partners-seed.xml        Corporate clients seed
├── theme/
│   ├── logo.svg                 BSH wordmark
│   ├── colors.css               --primary, --accent for whitelabel
│   └── login-bg.jpg             BSH login background
└── translations/
    ├── bn.json                  Bengali strings (clinical UI)
    └── en.json                  English overrides (BSH terminology)
```

## Phase 2 status

Scaffold + spec only. Each file is a 1-line placeholder pointing at the
**`BSH_INTELLIGENCE_LAYER_DESIGN.md` § 2.2** definitive structure. Actual
content (Bengali strings, drug formulary, lab panels) is filled in
during Phase 1A deployment cycle as BSH IT provides the data sample.
