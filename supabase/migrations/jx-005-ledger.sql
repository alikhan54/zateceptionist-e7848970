-- ============================================================================
-- jx-005-ledger.sql — PKR double-entry General Ledger (Project JX, Phase 8a)
-- 3 NEW tenant-scoped tables (jx_account / jx_voucher / jx_voucher_line) + RLS,
-- and Legacy's chart of accounts seed (REAL config — kept, not test data).
-- Additive, idempotent, slug-keyed. Fresh GL (no Smart-Ledger reuse). MVP = cash/
-- revenue/tax flows; metal handled by jx_gold_ledger (grams). No perpetual COGS yet.
-- Apply via DIRECT 5432. Rollback: jx-005-rollback (DROP the 3 tables).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.jx_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('asset','liability','equity','income','expense')),
  parent_id UUID REFERENCES public.jx_account(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jx_account_code_unique_per_tenant UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.jx_voucher (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  type TEXT,
  voucher_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  narration TEXT,
  ref_table TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_voucher_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  voucher_id UUID REFERENCES public.jx_voucher(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.jx_account(id) ON DELETE RESTRICT,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jx_account_tenant       ON public.jx_account(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_voucher_tenant       ON public.jx_voucher(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_voucher_ref          ON public.jx_voucher(tenant_id, ref_table, ref_id);
CREATE INDEX IF NOT EXISTS idx_jx_voucher_line_tenant  ON public.jx_voucher_line(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_voucher_line_voucher ON public.jx_voucher_line(voucher_id);
CREATE INDEX IF NOT EXISTS idx_jx_voucher_line_account ON public.jx_voucher_line(account_id);

-- RLS: enable + canonical accounting_invoices 5-policy block (verbatim) per table.
DO $jx_rls$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY['jx_account','jx_voucher','jx_voucher_line'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS rls_master_admin_all ON public.%I;', t);
    EXECUTE format($p$CREATE POLICY rls_master_admin_all ON public.%I AS PERMISSIVE FOR ALL TO public USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS rls_tenant_read ON public.%I;', t);
    EXECUTE format($p$CREATE POLICY rls_tenant_read ON public.%I AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = get_user_tenant_id()));$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS rls_tenant_write ON public.%I;', t);
    EXECUTE format($p$CREATE POLICY rls_tenant_write ON public.%I AS PERMISSIVE FOR INSERT TO public WITH CHECK ((tenant_id = get_user_tenant_id()));$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS rls_tenant_update ON public.%I;', t);
    EXECUTE format($p$CREATE POLICY rls_tenant_update ON public.%I AS PERMISSIVE FOR UPDATE TO public USING ((tenant_id = get_user_tenant_id()));$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS rls_tenant_delete ON public.%I;', t);
    EXECUTE format($p$CREATE POLICY rls_tenant_delete ON public.%I AS PERMISSIVE FOR DELETE TO public USING ((tenant_id = get_user_tenant_id()));$p$, t);
  END LOOP;
END
$jx_rls$;

-- Legacy chart of accounts (REAL config — idempotent; keep, do not clean up).
INSERT INTO public.jx_account (tenant_id, code, name, type)
SELECT 'legacy-jewellers', v.code, v.name, v.type
FROM (VALUES
  ('1000','Cash in Hand','asset'),
  ('1010','Bank','asset'),
  ('1100','Gold Inventory','asset'),
  ('1200','Customer Receivables','asset'),
  ('1300','Old Gold / Scrap Inventory','asset'),
  ('2000','Customer Advances','liability'),
  ('2100','Tax Payable','liability'),
  ('2200','Karigar Payable','liability'),
  ('3000','Owner''s Equity','equity'),
  ('4000','Gold Sales','income'),
  ('4100','Making Income','income'),
  ('4200','Polish Income','income'),
  ('4300','Stone Income','income'),
  ('5000','Discounts Allowed','expense'),
  ('5100','Making Paid','expense'),
  ('5200','Purchases','expense')
) AS v(code, name, type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.jx_account a WHERE a.tenant_id='legacy-jewellers' AND a.code=v.code
);

COMMIT;

NOTIFY pgrst, 'reload schema';
