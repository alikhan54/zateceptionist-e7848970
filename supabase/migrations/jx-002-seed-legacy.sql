-- ============================================================================
-- jx-002-seed-legacy.sql — seed Legacy Jewellers ONLY (tenant_id='legacy-jewellers')
-- Idempotent (NOT EXISTS guards). Run as postgres via DIRECT 5432.
--   * jx_setting: one row (PKR, tola 11.6638, PSQCA, WhatsApp, collections).
--   * jx_gold_rate: 4 placeholder rows (24/22/21/18), source='placeholder' — these
--     are NOT real market rates; the shop sets real rates via the Phase 4 page.
-- No other tenant is touched.
-- ============================================================================

-- jx_setting (one per tenant)
INSERT INTO public.jx_setting
  (tenant_id, currency, tola_grams, hallmark_standard, rate_source, whatsapp_number, invoice_branding, collections)
SELECT
  'legacy-jewellers', 'PKR', 11.6638, 'PSQCA', 'manual', '+923402786222',
  '{"name":"Legacy Jewellers"}'::jsonb,
  '["Necklace Sets","Bangles","Bracelets","Chains & Rings","Earrings & Tops","Kara & Kara Pairs","Baby Jewelry","Nose Wear","Pendant Sets","Rings"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.jx_setting WHERE tenant_id = 'legacy-jewellers');

-- jx_gold_rate — 4 PLACEHOLDER rows (rate_per_gram=1 is obviously not a real PKR rate)
INSERT INTO public.jx_gold_rate
  (tenant_id, metal, karat, rate_per_gram, rate_per_tola, source, effective_at)
SELECT v.tenant_id, v.metal, v.karat, v.rpg, v.rpt, 'placeholder', now()
FROM (VALUES
  ('legacy-jewellers', 'gold', 24, 1::numeric, 11.6638::numeric),
  ('legacy-jewellers', 'gold', 22, 1::numeric, 11.6638::numeric),
  ('legacy-jewellers', 'gold', 21, 1::numeric, 11.6638::numeric),
  ('legacy-jewellers', 'gold', 18, 1::numeric, 11.6638::numeric)
) AS v(tenant_id, metal, karat, rpg, rpt)
WHERE NOT EXISTS (
  SELECT 1 FROM public.jx_gold_rate g
  WHERE g.tenant_id = v.tenant_id AND g.karat = v.karat AND g.source = 'placeholder'
);
