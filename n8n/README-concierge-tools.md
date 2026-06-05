# 420 Jewellery — Voice + WhatsApp Concierge (Project JX, Phase 12)

Legacy Jewellers' **concierge**: a NEW VAPI assistant specialised on the Phase-10 KB, wired to
3 NEW jewellery-gated tool-webhooks. **Additive; sacred comms (`TXeVEskxcLuLwplr`) + shared
assistants untouched. Live voice/WhatsApp conversation testing is DEFERRED** (Legacy has no
connected Meta WhatsApp number or VAPI phone number yet — separate setup).

## Tool-webhooks — n8n workflow `kv6AxISCOoJBvE6X` (INACTIVE)
Export: [`jx-concierge-tools.json`](./jx-concierge-tools.json) (18 nodes, 3 webhook chains).
Each is **tenant-scoped** (reads `tenant` from query/body/VAPI args), slug-keyed `jx_*`, Supabase
via HTTP Request + `supabaseApi` cred, **Respond-to-Webhook in series** (`responseMode: responseNode`).
Parses **both** VAPI `message.toolCalls[]` payloads and direct test bodies; responds in VAPI form
`{ "results": [ { "toolCallId", "result" } ], ... }`.

| Path | Reads/Writes | Returns |
|---|---|---|
| `POST /webhook/jewellery/get-gold-rate` | `jx_gold_rate` (by tenant, opt. karat) | per-gram + per-tola per karat |
| `POST /webhook/jewellery/order-status` | `jx_order` (by order_no, opt. phone) | status + expected delivery + balance |
| `POST /webhook/jewellery/book-appointment` | **writes** `jx_customer` (lead) — **explicit `industry='jewellery'` gate** | confirmation |

Gating: reads are slug-filtered on jewellery-only tables (a non-jewellery tenant sees nothing of
Legacy's); the **write** additionally validates `tenant_config.industry='jewellery'` before insert.
`alwaysOutputData` on the GET nodes so empty result sets still return a graceful reply.

**Deploy = activate the workflow** (registers the 3 webhooks). It's INACTIVE now; nothing calls it
until Legacy's VAPI number/WhatsApp connects.

## VAPI assistant `c3b99c01-dcfb-4d6c-953e-18b6ca98ea38` — "Legacy Jewellers Concierge"
- Created via VAPI API/MCP (NEW assistant; the shared "Zate AI" `1238736d…` was NOT modified).
- **Instructions = Legacy's Phase-10 voice `ai_model_configs` system prompt + knowledge pack, verbatim**
  (concierge persona; today's 22K/21K/24K rate; F-7 Markaz hours/location; order & repair status;
  appointment/custom-order booking; ZERO-DEDUCTION exchange + buyback + GOLD RATE PROTECTION
  explainers; after-sales/maintenance; catalog by collection; lead capture; escalation rules).
- **Escalation**: price negotiation, large/bespoke custom orders, valuation disputes → human.
- **Languages**: English, Urdu, Roman-Urdu. LLM gpt-4o; voice vapi/Elliot; transcriber deepgram nova-3.
- **3 tools attached** → the webhooks above, each scoped `?tenant=legacy-jewellers`:
  - getGoldRate `59a34fcf-b86d-4689-8879-3effad6c9bf2`
  - getOrderStatus `d3193fd5-ed0c-4eff-9500-552b3f1380ee`
  - bookAppointment `f7ffe70f-6205-40c3-b439-fa5e08e50ed5`
- **Routing**: `tenant_config.vapi_assistant_id = c3b99c01…` (set). The platform resolves the tenant's
  assistant via this field (T36 / UV.2), so **no comms-workflow change is needed**.

## Dependencies before go-live (deploy)
1. Activate workflow `kv6AxISCOoJBvE6X` (registers the webhooks).
2. Connect a VAPI phone number to the assistant (inbound voice) and/or Legacy's Meta WhatsApp number.
3. (Optional) point the assistant's WhatsApp/voice provider at the connected channel.

## Proof (Phase 12 — tools + config, NOT live calls)
Tools tested by activating the workflow and invoking each webhook with real data, then deactivating:
- get-gold-rate: set Legacy 22K=22500 → returned "22K: PKR 22500/g (262435.5/tola)"; control tenant
  `bbqtonight` → empty (cannot read Legacy). Reverted to placeholder.
- order-status: created `ORD-P12TEST` → returned "in_workshop, delivery …, Balance 50000"; control → none. Deleted.
- book-appointment: returned booked + created a Legacy `jx_customer`; control tenant → **rejected (gate)**,
  no row created. Deleted.
Assistant: gpt-4o + 3 toolIds = the 3 above; tool URLs are the tenant-scoped jewellery webhooks;
`vapi_assistant_id` set; shared "Zate AI" assistant unchanged; only one new n8n workflow id added.
Live voice + WhatsApp conversation testing deferred until channels connect.

## Rollback
Delete workflow `kv6AxISCOoJBvE6X`; delete assistant `c3b99c01…` + the 3 tools; unset
`tenant_config.vapi_assistant_id`. No existing workflow/assistant was modified.
