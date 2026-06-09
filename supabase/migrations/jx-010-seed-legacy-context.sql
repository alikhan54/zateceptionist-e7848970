-- ============================================================================
-- jx-010-seed-legacy-context.sql — populate Legacy Jewellers' agent context (Project JX, Phase 10)
-- REAL CONFIG (kept, NOT test data). Uses the platform mechanism:
--   1) initialize_new_tenant('legacy-jewellers','jewellery','Legacy Jewellers') — guarded so
--      it runs only once (creates onboarding_sessions + business_profiles stub + 6 ai_model_configs
--      from the jewellery template). REQUIRES jx-009 applied first.
--   2) enrich business_profiles / tenant_config / onboarding_sessions / ai_model_configs with the
--      verified site data (thelegacyjewellers.com). Direct seed — the n8n OB scrape is intentionally
--      NOT run (see COORDINATION.md jx-p10 decision).
-- Idempotent: the init is guarded; all enrichment is UPDATE. Apply via DIRECT 5432.
-- onboarding_completed is set true SEPARATELY by the runner AFTER content verification.
-- Rollback: DELETE the Legacy rows from onboarding_sessions/business_profiles/ai_model_configs/
--   onboarding_checklists (+ revert tenant_config fields & onboarding_completed=false).
-- ============================================================================

-- 1) Apply the jewellery template to Legacy (once)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.onboarding_sessions WHERE tenant_id = 'legacy-jewellers') THEN
    PERFORM public.initialize_new_tenant('legacy-jewellers', 'jewellery', 'Legacy Jewellers');
  END IF;
END $$;

-- 2) business_profiles — the rich profile (the OB scrape's target table), seeded from verified data
UPDATE public.business_profiles SET
  company_name = 'Legacy Jewellers',
  legal_name = 'Legacy Jewellers',
  industry = 'jewellery',
  sub_industry = 'Gold & Diamond Jewellery Retail',
  company_size = 'small',
  founded_year = 2015,
  short_description = 'Trusted family jeweller in F-7 Markaz, Islamabad — PSQCA-hallmarked pure gold and GIA/IGI-certified diamonds, since 2015.',
  long_description = $d$Legacy Jewellers is a trusted, family-run jeweller in F-7 Markaz, Islamabad, serving customers since 2015. We specialise in PSQCA-hallmarked pure gold and GIA/IGI-certified diamonds across ten signature collections. Our promise is transparency and trust: zero-deduction 22K gold exchange, pricing that adds only making and GST over the live gold rate, gold rate protection (an advance locks today's rate), lifetime maintenance, one-year insurance, and a guaranteed buyback. Visit us Mon-Thu 10:00-20:00, Fri 15:00-21:30, Sat 12:00-21:30, and Sun 14:00-21:30.$d$,
  unique_value_proposition = $u$PSQCA-hallmarked pure gold & GIA/IGI-certified diamonds; ZERO-DEDUCTION 22K gold exchange; transparent pricing (only making + GST); gold rate protection (an advance locks the rate); lifetime maintenance, 1-year insurance & guaranteed buyback.$u$,
  mission_statement = $m$To make buying gold and diamonds in Islamabad transparent, trustworthy and delightful — pure, certified, fairly priced, and backed for life.$m$,
  headquarters_address = '{"full":"Shop No 1, Ground Floor, Trade Center, F-7 Markaz, Block 20-B, Islamabad 44210, Pakistan","line1":"Shop No 1, Ground Floor, Trade Center","area":"F-7 Markaz, Block 20-B","city":"Islamabad","postal_code":"44210","country":"Pakistan"}'::jsonb,
  service_areas = '["Islamabad","F-7 Markaz","Rawalpindi"]'::jsonb,
  timezone = 'Asia/Karachi',
  primary_email = 'info@thelegacyjewellers.com',
  primary_phone = '+92 340 2786222',
  secondary_contacts = '{"whatsapp":"+92 340 2786222","instagram":"legacyjewellers786","hours":{"mon_thu":"10:00-20:00","fri":"15:00-21:30","sat":"12:00-21:30","sun":"14:00-21:30"}}'::jsonb,
  website_url = 'https://thelegacyjewellers.com',
  instagram_url = 'https://instagram.com/legacyjewellers786',
  primary_color = '#C9A227',
  secondary_color = '#2B2B2B',
  data_sources = '["verified_manual_seed","thelegacyjewellers.com","instagram:legacyjewellers786"]'::jsonb,
  extraction_confidence = 1.0,
  last_verified_at = now(),
  updated_at = now()
WHERE tenant_id = 'legacy-jewellers';

-- 3) tenant_config — the fields the Settings > Company Info page + agents read (business profile core)
UPDATE public.tenant_config SET
  city = 'Islamabad',
  services_description = $s$Gold and diamond jewellery — Necklace Sets, Bangles, Bracelets, Chains & Rings, Earrings & Tops, Kara & Kara Pairs, Baby Jewelry, Nose Wear, Pendant Sets, Rings; plus custom/bespoke orders, jewelry repair, zero-deduction 22K gold exchange, and gold rate protection.$s$,
  target_audience = $t$Bridal & wedding shoppers, gold investors/savers, and gifting customers in Islamabad/Rawalpindi seeking trusted, hallmarked pure gold and certified diamonds.$t$,
  value_proposition = $v$PSQCA-hallmarked pure gold & GIA/IGI-certified diamonds; zero-deduction 22K gold exchange; transparent pricing (only making + GST); gold rate protection (advance locks the rate); lifetime maintenance, 1-year insurance & guaranteed buyback.$v$,
  opening_time = '10:00',
  closing_time = '20:00',
  ai_name = 'Legacy Concierge',
  ai_role = 'Jewellery Concierge',
  updated_at = now()
WHERE tenant_id = 'legacy-jewellers';

-- 4) onboarding_sessions — record the (verified, manual) extraction end-state, as a scrape would leave it
UPDATE public.onboarding_sessions SET
  input_type = 'website',
  primary_input = 'https://thelegacyjewellers.com',
  scraped_data = '{"source":"manual-verified","company_name":"Legacy Jewellers","industry":"jewellery","since":2015,"address":"Shop No 1, Ground Floor, Trade Center, F-7 Markaz, Block 20-B, Islamabad 44210, Pakistan","city":"Islamabad","hours":{"mon_thu":"10:00-20:00","fri":"15:00-21:30","sat":"12:00-21:30","sun":"14:00-21:30"},"contact":{"phone":"+92 340 2786222","whatsapp":"+92 340 2786222","email":"info@thelegacyjewellers.com"},"social":{"instagram":"legacyjewellers786","website":"https://thelegacyjewellers.com"},"collections":["Necklace Sets","Bangles","Bracelets","Chains & Rings","Earrings & Tops","Kara & Kara Pairs","Baby Jewelry","Nose Wear","Pendant Sets","Rings"],"services":["Custom Order (Bespoke)","Jewelry Repair","Gold Exchange (Zero-Deduction 22K)","Gold Rate Protection (Advance Lock)"],"usps":["PSQCA-hallmarked pure gold","GIA/IGI certified diamonds","Zero-deduction 22K gold exchange","Transparent pricing (making + GST only)","Gold rate protection (advance locks the rate)","Lifetime maintenance","1-year insurance","Guaranteed buyback"],"certifications":["PSQCA hallmark","GIA","IGI"],"currency":"PKR"}'::jsonb,
  ai_analysis = '{"summary":"Trusted family gold & diamond jeweller, F-7 Markaz Islamabad (since 2015). Differentiators: zero-deduction 22K exchange, gold rate protection, transparent making+GST pricing, lifetime maintenance, buyback.","confidence":1.0,"recommended_ai_name":"Legacy Concierge","recommended_tone":"warm, premium"}'::jsonb,
  confidence_scores = '{"overall":1.0,"contact":1.0,"services":1.0,"usps":1.0}'::jsonb,
  steps_completed = '["discovery"]'::jsonb,
  extraction_status = 'completed',
  completion_percentage = 100,
  last_activity_at = now(),
  completed_at = now(),
  updated_at = now()
WHERE tenant_id = 'legacy-jewellers';

-- 5) ai_model_configs — knowledge pack + style for all 6; escalation/avoid for customer-facing agents
UPDATE public.ai_model_configs SET
  industry_knowledge_pack = $k$Legacy Jewellers — concierge knowledge base.
LIVE RATES: quote today's 24K/22K/21K gold rate only when the system provides it; never invent a rate.
LOCATION & HOURS: Shop No 1, Ground Floor, Trade Center, F-7 Markaz, Block 20-B, Islamabad. Mon-Thu 10:00-20:00; Fri 15:00-21:30; Sat 12:00-21:30; Sun 14:00-21:30.
CONTACT: Phone/WhatsApp +92 340 2786222; info@thelegacyjewellers.com; Instagram legacyjewellers786; thelegacyjewellers.com.
COLLECTIONS: Necklace Sets, Bangles, Bracelets, Chains & Rings, Earrings & Tops, Kara & Kara Pairs, Baby Jewelry, Nose Wear, Pendant Sets, Rings.
PROMISES: PSQCA-hallmarked pure gold; GIA/IGI-certified diamonds; ZERO-DEDUCTION 22K gold exchange; transparent pricing (only making + GST over the rate); GOLD RATE PROTECTION (an advance locks today's rate); lifetime maintenance; 1-year insurance; guaranteed buyback.
SERVICES: appointment & custom-order booking; order & repair status; exchange + buyback explainer; rate-protection explainer; after-sales/maintenance; catalog by collection; lead capture.
ESCALATE to a human: price negotiation, large/bespoke custom orders, valuation disputes. Never quote final custom prices autonomously.$k$,
  response_style = 'Warm, premium and concise. Replies in the customer''s language (English, Urdu, or Roman-Urdu).',
  is_active = true,
  updated_at = now()
WHERE tenant_id = 'legacy-jewellers';

UPDATE public.ai_model_configs SET
  escalation_triggers = ARRAY['price negotiation','large or bespoke custom orders','valuation disputes']::text[],
  topics_to_avoid = ARRAY['quoting a final custom-order price autonomously','negotiating price autonomously','giving a binding gold valuation']::text[],
  updated_at = now()
WHERE tenant_id = 'legacy-jewellers' AND model_type IN ('sales','marketing','communication','voice');

NOTIFY pgrst, 'reload schema';
