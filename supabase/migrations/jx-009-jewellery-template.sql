-- ============================================================================
-- jx-009-jewellery-template.sql — add the 'jewellery' industry template (Project JX, Phase 10)
-- ADDITIVE: a single new row in public.industry_templates. Alters NO other industry's
-- row (ON CONFLICT (industry_code) DO NOTHING — industry_code is UNIQUE). Consumed by
-- public.initialize_new_tenant('<tenant>','jewellery',...) which seeds onboarding_sessions
-- + business_profiles + 6 ai_model_configs from this row's ai_context_template, and exposes
-- vocabulary / deal_stages / common_services / persona_templates to the agents.
-- Apply via DIRECT 5432. Rollback: DELETE FROM public.industry_templates WHERE industry_code='jewellery';
-- ============================================================================

INSERT INTO public.industry_templates (
  id, industry_code, industry_name, display_name, icon, is_active,
  vocabulary, deal_stages, nurture_sequences, scoring_weights,
  common_services, persona_templates, onboarding_questions,
  brand_voice_suggestions, ai_name_suggestions, ai_context_template,
  created_at, updated_at
)
SELECT
  gen_random_uuid(), 'jewellery', 'Jewellery', 'Jewellery & Gold', '💍', true,
  -- vocabulary: generic CRM term -> jewellery term
  '{"lead":"Inquiry","leads":"Inquiries","customer":"Client","customers":"Clients","deal":"Order","deals":"Orders","meeting":"Appointment","meetings":"Appointments","proposal":"Quotation","pipeline":"Sales Journey","won":"Delivered","lost":"Lost","service":"Collection","appointment":"Appointment","follow_up":"Follow-up","conversion":"Sold","qualification":"Consultation"}'::jsonb,
  -- deal_stages: lead -> consultation -> order booked -> in workshop -> ready -> delivered/sold
  '[{"id":"inquiry","name":"Inquiry","color":"#94a3b8","probability":10},{"id":"consultation","name":"Consultation","color":"#60a5fa","probability":30},{"id":"order_booked","name":"Order Booked","color":"#F59E0B","probability":55},{"id":"in_workshop","name":"In Workshop","color":"#a78bfa","probability":70},{"id":"ready","name":"Ready for Pickup","color":"#06B6D4","probability":90},{"id":"delivered","name":"Delivered / Sold","color":"#22c55e","probability":100}]'::jsonb,
  '[]'::jsonb,   -- nurture_sequences (NOT NULL)
  '{}'::jsonb,   -- scoring_weights (NOT NULL)
  -- common_services: the collection taxonomy + custom order / repair / gold exchange / rate protection
  '[{"name":"Necklace Sets","category":"collection"},{"name":"Bangles","category":"collection"},{"name":"Bracelets","category":"collection"},{"name":"Chains & Rings","category":"collection"},{"name":"Earrings & Tops","category":"collection"},{"name":"Kara & Kara Pairs","category":"collection"},{"name":"Baby Jewelry","category":"collection"},{"name":"Nose Wear","category":"collection"},{"name":"Pendant Sets","category":"collection"},{"name":"Rings","category":"collection"},{"name":"Custom Order (Bespoke)","category":"service","price_type":"quote"},{"name":"Jewelry Repair","category":"service","price_type":"quote"},{"name":"Gold Exchange (Zero-Deduction 22K)","category":"service","price_type":"trade_in"},{"name":"Gold Rate Protection (Advance Lock)","category":"service","price_type":"deposit"}]'::jsonb,
  -- persona_templates: the AI concierge persona FIRST, then customer personas
  '[{"name":"Legacy Concierge (AI)","type":"assistant","tone":"warm, premium, knowledgeable","languages":["English","Urdu","Roman-Urdu"],"goals":["Share today''s gold rate (22K/21K/24K)","Explain zero-deduction 22K exchange & gold rate protection","Book appointments & custom orders","Give order & repair status","Capture leads (name + WhatsApp)"],"escalation":["price negotiation","large/bespoke custom orders","valuation disputes"]},{"name":"Bridal / Wedding Shopper","type":"B2C","goals":["Find bridal sets","Trusted hallmarked gold","Stay within budget"],"channels":["whatsapp","instagram","phone"],"pain_points":["Purity trust","Making charges","Budget"]},{"name":"Gold Investor / Saver","type":"B2C","goals":["Buy pure gold at a fair rate","Buyback assurance","Lock the rate"],"channels":["whatsapp","phone"],"pain_points":["Rate volatility","Deduction on exchange","Resale value"]},{"name":"Gifting Customer","type":"B2C","goals":["Baby jewelry / gifts","Quick selection","Certificate"],"channels":["instagram","whatsapp"],"pain_points":["Authenticity","Delivery time"]}]'::jsonb,
  -- onboarding_questions
  '["What gold karats and today''s rates do you offer (24K/22K/21K)?","Which collections do you carry?","Do you offer custom/bespoke orders and repairs?","What is your gold-exchange policy (deduction or zero-deduction)?","Do you offer gold rate protection / advance booking?","What are your store hours and location?","Which certifications do you provide (PSQCA hallmark, GIA/IGI)?"]'::jsonb,
  ARRAY['Warm','Premium','Trustworthy','Knowledgeable','Family heritage']::text[],
  ARRAY['Legacy Concierge','Noor','Sona','Zara']::text[],
  $ctx$You are the Legacy Concierge, the warm, courteous and knowledgeable AI assistant for {{company_name}}, a trusted family jeweller in F-7 Markaz, Islamabad (serving customers since 2015). Reply in the customer's language — English, Urdu, or Roman-Urdu — in a premium, respectful tone.

You can help with:
- Today's gold rate (24K / 22K / 21K) when the system provides it.
- Store hours, location and directions (F-7 Markaz, Islamabad).
- Order and repair status.
- Booking appointments and custom (bespoke) orders.
- Explaining our promises: PSQCA-hallmarked pure gold; GIA/IGI-certified diamonds; ZERO-DEDUCTION 22K gold exchange; transparent pricing (only making + GST over the gold rate); GOLD RATE PROTECTION (an advance locks today's rate); lifetime maintenance; 1-year insurance; and guaranteed buyback.
- Presenting our collections: Necklace Sets, Bangles, Bracelets, Chains & Rings, Earrings & Tops, Kara & Kara Pairs, Baby Jewelry, Nose Wear, Pendant Sets, and Rings.

Rules:
- NEVER quote a final price for a custom order or a valuation, and NEVER negotiate price autonomously. Politely offer to connect the customer with our team and capture their name and WhatsApp.
- ESCALATE to a human for price negotiation, large or bespoke custom orders, and valuation disputes.
- Always be transparent and build trust; gather the customer's name and WhatsApp number for follow-up.$ctx$,
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.industry_templates WHERE industry_code = 'jewellery')
ON CONFLICT (industry_code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
