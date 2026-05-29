# BSH-HMS — Cloudflare Tunnel Setup

> **Status:** setup spec for exposing the AMD-local BSH stack (Bahmni + 3 FastAPI services)
> through the existing Cloudflare tunnel. **Additive** — appends ingress rules; does not rewrite
> the tunnel. No live DNS/tunnel change is made by this doc (AMD-day action).
>
> Labels: `[VERIFIED-CODE]` = read from Dockerfiles / compose / deploy script this session;
> `[DESIGN]` = proposed tunnel/DNS/WAF config.

---

## 0. Premise corrections (ports & filenames) `[VERIFIED-CODE]`

- The task said **"ports 8200–8203."** The real serving ports are **8080 (Bahmni) + 9101 / 9102 /
  9103 (the 3 services)** — read directly from the Dockerfiles and compose. There is **no service
  on 8200–8203.**
- There are **3** FastAPI services, not 4. The 4th hostname maps to **Bahmni itself**.
- The deploy script is **`scripts/deploy-bahmni-cloud.sh`**, not `deploy-bahmni-amd.sh`.

| Service | Container | Port `[VERIFIED-CODE]` | Source |
|---|---|---:|---|
| Bahmni (OpenMRS/OpenELIS/Odoo + OWA) | bahmni stack | **8080** | `deploy-bahmni-cloud.sh:51` (FHIR at `:8080/openmrs/ws/fhir2/R4/metadata`) |
| bsh-auth-bridge | `bsh-auth-bridge` | **9101** | Dockerfile `EXPOSE 9101`; compose `9101:9101` |
| bsh-multi-branch-aggregator | `bsh-multi-branch-aggregator` | **9102** | Dockerfile `EXPOSE 9102` |
| bsh-vapi-handler | `bsh-vapi-handler` | **9103** | Dockerfile `EXPOSE 9103` |

> Note: only `bsh-auth-bridge/docker-compose.yml` exists (defines `bsh-auth-bridge` on the shared
> external network `langgraph-agents_langgraph-net`). The aggregator and vapi-handler have
> Dockerfiles but are **not yet in a compose file** — add them to a compose (same external network)
> or `docker run` them so cloudflared can reach them by container name or `localhost:910x`.

---

## 1. Hostname → origin map `[DESIGN]`

| Public hostname | Origin (from cloudflared's host) | Purpose |
|---|---|---|
| `hms-bsh.zatesystems.com` | `http://localhost:8080` | Bahmni web UI + OWA operations app |
| `bsh-auth.zatesystems.com` | `http://localhost:9101` | auth-bridge (mints scoped Bahmni session) |
| `bsh-aggregator.zatesystems.com` | `http://localhost:9102` | multi-branch metrics API |
| `bsh-vapi.zatesystems.com` | `http://localhost:9103` | VAPI handler (`/vapi/inbound`) |

> If the services run as containers on `langgraph-agents_langgraph-net` and cloudflared runs in a
> container on the **same** network, use `http://bsh-auth-bridge:9101` etc. instead of `localhost`.
> If cloudflared runs on the **host** (Windows service), use `http://localhost:910x` (containers
> publish their ports per the compose `ports:` mapping).

---

## 2. Additive ingress block `[DESIGN]`

The tunnel config lives **on the AMD host**, outside this repo — typically
`C:\Users\aumbr\.cloudflared\config.yml` (Windows) or `/etc/cloudflared/config.yml`. It is **not**
checked into the frontend repo, so paste the block below into the existing file.

**CRITICAL cloudflared gotcha:** ingress rules are evaluated top-to-bottom and the **catch-all
`service: http_status:404` MUST stay last**. Insert the 4 new rules **above** it.

```yaml
# --- BSH-HMS (append ABOVE the catch-all 404) ---
  - hostname: hms-bsh.zatesystems.com
    service: http://localhost:8080
  - hostname: bsh-auth.zatesystems.com
    service: http://localhost:9101
  - hostname: bsh-aggregator.zatesystems.com
    service: http://localhost:9102
  - hostname: bsh-vapi.zatesystems.com
    service: http://localhost:9103
# --- existing catch-all stays last ---
  - service: http_status:404
```

(`tunnel:` and `credentials-file:` at the top of the existing config are untouched.)

---

## 3. DNS records `[DESIGN]`

For each new hostname add a **CNAME** (proxied / orange-cloud) to the tunnel target:
```
hms-bsh         CNAME  <TUNNEL_UUID>.cfargotunnel.com   (proxied)
bsh-auth        CNAME  <TUNNEL_UUID>.cfargotunnel.com   (proxied)
bsh-aggregator  CNAME  <TUNNEL_UUID>.cfargotunnel.com   (proxied)
bsh-vapi        CNAME  <TUNNEL_UUID>.cfargotunnel.com   (proxied)
```
Or, once the ingress is in `config.yml`, let cloudflared create them:
`cloudflared tunnel route dns <TUNNEL_NAME> hms-bsh.zatesystems.com` (repeat per hostname).
`<TUNNEL_UUID>` = the existing tunnel's ID (same tunnel that serves the other `*.zatesystems.com`).

---

## 4. SSL / TLS `[DESIGN]`

- **Edge:** Cloudflare presents a valid cert for `*.zatesystems.com` automatically (proxied). Set
  the zone SSL mode to **Full** (origin is reached via the tunnel, so the public TLS is terminated
  at Cloudflare and the cloudflared↔origin hop is local/loopback — no origin cert needed for plain
  `http://localhost:910x`). Do **not** use "Flexible."
- **HSTS** can be enabled at the edge for these hostnames.
- Bahmni's own self-signed cert is bypassed because cloudflared talks to it over `http://localhost:8080`.

---

## 5. Rate limiting & WAF `[DESIGN]`

Add Cloudflare rate-limit rules (these endpoints are sensitive):

| Hostname | Rule | Rationale |
|---|---|---|
| `bsh-vapi.zatesystems.com` | ≤ 60 req/min per IP | VAPI is the only legit caller; throttle abuse. Also verify the `X-Vapi-Secret` header at the origin (see VAPI doc §5). |
| `bsh-auth.zatesystems.com` | ≤ 30 req/min per IP; challenge on burst | auth/session minting — brute-force surface. |
| `hms-bsh.zatesystems.com` | put behind **Cloudflare Access** (email/OTP or IdP) | Bahmni UI + OWA must NOT be open to the public internet — staff-only. |
| `bsh-aggregator.zatesystems.com` | ≤ 120 req/min; Access-gated | internal metrics; not public. |

**Strong recommendation:** gate `hms-bsh` and `bsh-aggregator` behind **Cloudflare Access** so only
authenticated hospital staff reach them. `bsh-vapi` stays public (VAPI must POST to it) but secured
by the shared secret + rate limit. `bsh-auth` is public-but-throttled.

---

## 6. Verification `[DESIGN]`

After applying (AMD day):
```bash
cloudflared tunnel info <TUNNEL_NAME>            # tunnel healthy, 4 new routes listed
curl -fsS https://bsh-vapi.zatesystems.com/health        # {"status":"healthy","service":"bsh-vapi-handler"}
curl -fsS https://bsh-aggregator.zatesystems.com/health  # aggregator health
curl -fsS https://hms-bsh.zatesystems.com/openmrs/ws/fhir2/R4/metadata   # Bahmni FHIR (behind Access → expect auth redirect if Access on)
```
Confirm the **other** `*.zatesystems.com` hostnames still resolve (additive change didn't break the
catch-all order).

---

## 7. AMD-day actions (not done here)

1. Ensure the 3 services are running (compose/`docker run`) on 9101/9102/9103 and Bahmni on 8080.
2. Append the §2 ingress block **above** the catch-all; `cloudflared` reload (restart service).
3. Create the 4 CNAMEs (§3).
4. Set zone SSL=Full; add the §5 rate-limit + Access rules.
5. Run §6 verification.
6. Update `bsh-demo.bahmni_base_url` only after Bahmni is reachable (NOT to the public hostname if
   the services reach Bahmni locally — keep `http://localhost:8080` for service→Bahmni, reserve
   `hms-bsh.zatesystems.com` for staff browsers).

**Estimate `[estimate]`:** ~30–45 min once the tunnel credentials are on the AMD box.
