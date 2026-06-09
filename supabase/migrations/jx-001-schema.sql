-- ============================================================================
-- jx-001-schema.sql — Gold/Jewelry vertical (Project JX, Phase 3)
-- Creates 15 NEW tenant-scoped tables (jx_*) + RLS. ADDITIVE ONLY.
--   * Touches NO existing table (pure CREATE TABLE / CREATE POLICY).
--   * Idempotent: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS/CREATE.
--   * Reversible: see jx-001-rollback.sql (DROP the jx_* tables).
--   * SLUG-keyed RLS: every table has tenant_id TEXT; policies use
--     get_user_tenant_id() (returns the slug). Canonical accounting_invoices
--     5-policy block, applied uniformly via the DO loop below.
--   * Ledger posting tables (jx_account / jx_voucher / jx_voucher_line) are
--     intentionally NOT created here — they come in the later ledger phase.
-- Apply via DIRECT 5432 (primary). Pooler 6543 can route read-only (T18).
-- ============================================================================

BEGIN;

-- ── Parent/standalone tables ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jx_setting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  currency TEXT,
  tola_grams NUMERIC,
  hallmark_standard TEXT,
  rate_source TEXT,
  whatsapp_number TEXT,
  invoice_branding JSONB,
  collections JSONB,
  default_making_template JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_gold_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  metal TEXT,
  karat INT,
  rate_per_gram NUMERIC,
  rate_per_tola NUMERIC,
  source TEXT,
  effective_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  cnic TEXT,
  notes TEXT,
  lifecycle_stage TEXT,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_worker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  default_making_rate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_tax_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT,
  basis TEXT CHECK (basis IN ('value','making','fixed_per_gram')),
  rate NUMERIC,
  active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Inventory ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jx_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  metal TEXT,
  karat INT,
  tag_number TEXT,
  group_item TEXT,
  design_no TEXT,
  size TEXT,
  gross_weight NUMERIC,
  net_weight NUMERIC,
  stone_weight NUMERIC,
  pure_weight NUMERIC,
  waste_pct NUMERIC,
  making_type TEXT,
  making_value NUMERIC,
  lacquer_type TEXT,
  lacquer_value NUMERIC,
  purchase_rate NUMERIC,
  item_cost NUMERIC,
  sale_price NUMERIC,
  worker_id UUID REFERENCES public.jx_worker(id) ON DELETE SET NULL,
  item_for TEXT,
  status TEXT,
  photo_urls JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jx_item_tag_unique_per_tenant UNIQUE (tenant_id, tag_number)
);

CREATE TABLE IF NOT EXISTS public.jx_stone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  item_id UUID REFERENCES public.jx_item(id) ON DELETE SET NULL,
  type TEXT,
  name TEXT,
  weight NUMERIC,
  unit TEXT,
  qty NUMERIC,
  rate NUMERIC,
  price NUMERIC,
  color TEXT,
  cut TEXT,
  clarity TEXT,
  is_loose BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Sales ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jx_sale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  sale_no TEXT,
  bill_book_no TEXT,
  customer_id UUID REFERENCES public.jx_customer(id) ON DELETE SET NULL,
  salesman_id UUID,
  sale_date TIMESTAMPTZ,
  gold_rate_snapshot JSONB,
  subtotal NUMERIC,
  discount NUMERIC,
  tax NUMERIC,
  old_gold_credit NUMERIC,
  net_bill NUMERIC,
  paid_cash NUMERIC,
  paid_card NUMERIC,
  paid_cheque NUMERIC,
  paid_used_gold_value NUMERIC,
  cash_balance NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_sale_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  sale_id UUID REFERENCES public.jx_sale(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.jx_item(id) ON DELETE SET NULL,
  tag_number TEXT,
  karat INT,
  net_weight NUMERIC,
  waste_pct NUMERIC,
  total_weight NUMERIC,
  making NUMERIC,
  polish NUMERIC,
  stone_value NUMERIC,
  line_total NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Orders (custom / bespoke) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jx_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  order_no TEXT,
  customer_id UUID REFERENCES public.jx_customer(id) ON DELETE SET NULL,
  salesman_id UUID,
  order_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  is_fix_rate BOOLEAN DEFAULT false,
  fixed_rate NUMERIC,
  advance_amount NUMERIC,
  advance_tender JSONB,
  discount NUMERIC,
  net_amount NUMERIC,
  balance NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jx_order_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  order_id UUID REFERENCES public.jx_order(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.jx_item(id) ON DELETE SET NULL,
  tag_number TEXT,
  karat INT,
  net_weight NUMERIC,
  waste_pct NUMERIC,
  total_weight NUMERIC,
  making NUMERIC,
  polish NUMERIC,
  stone_value NUMERIC,
  line_total NUMERIC,
  assigned_worker_id UUID REFERENCES public.jx_worker(id) ON DELETE SET NULL,
  workshop_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Old gold trade-in ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jx_old_gold (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.jx_customer(id) ON DELETE SET NULL,
  net_weight NUMERIC,
  karat INT,
  purity NUMERIC,
  rate NUMERIC,
  credit_value NUMERIC,
  linked_sale_id UUID REFERENCES public.jx_sale(id) ON DELETE SET NULL,
  zero_deduction BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Workers / karigar ledger (balances computed from txns; not stored) ───────
CREATE TABLE IF NOT EXISTS public.jx_worker_txn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  worker_id UUID REFERENCES public.jx_worker(id) ON DELETE CASCADE,
  type TEXT,
  net_grams NUMERIC,
  karat INT,
  making_amount NUMERIC,
  item_id UUID REFERENCES public.jx_item(id) ON DELETE SET NULL,
  txn_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Repairs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jx_repair (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.jx_customer(id) ON DELETE SET NULL,
  item_desc TEXT,
  received_date TIMESTAMPTZ,
  promised_date TIMESTAMPTZ,
  charge NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Physical gold ledger (signed fine grams; polymorphic ref, no FK) ─────────
CREATE TABLE IF NOT EXISTS public.jx_gold_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  ledger_date TIMESTAMPTZ,
  direction TEXT CHECK (direction IN ('in','out')),
  reason TEXT,
  karat INT,
  net_grams NUMERIC,
  fine_grams NUMERIC,
  ref_table TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── tenant_id indexes (RLS perf + lookups) ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jx_setting_tenant      ON public.jx_setting(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_gold_rate_tenant    ON public.jx_gold_rate(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_customer_tenant     ON public.jx_customer(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_worker_tenant       ON public.jx_worker(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_tax_rule_tenant     ON public.jx_tax_rule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_item_tenant         ON public.jx_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_stone_tenant        ON public.jx_stone(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_sale_tenant         ON public.jx_sale(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_sale_item_tenant    ON public.jx_sale_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_order_tenant        ON public.jx_order(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_order_item_tenant   ON public.jx_order_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_old_gold_tenant     ON public.jx_old_gold(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_worker_txn_tenant   ON public.jx_worker_txn(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_repair_tenant       ON public.jx_repair(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jx_gold_ledger_tenant  ON public.jx_gold_ledger(tenant_id);

-- ── RLS: enable + canonical accounting_invoices 5-policy block (verbatim) ─────
-- Applied uniformly to all 15 tables. Per-table policy set (count = 5):
--   rls_master_admin_all  FOR ALL    TO public USING  (auth.jwt()->>'role' = 'master_admin')
--   rls_tenant_read       FOR SELECT TO public USING  (tenant_id = get_user_tenant_id())
--   rls_tenant_write      FOR INSERT TO public CHECK  (tenant_id = get_user_tenant_id())
--   rls_tenant_update     FOR UPDATE TO public USING  (tenant_id = get_user_tenant_id())
--   rls_tenant_delete     FOR DELETE TO public USING  (tenant_id = get_user_tenant_id())
DO $jx_rls$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'jx_setting','jx_gold_rate','jx_customer','jx_worker','jx_tax_rule',
    'jx_item','jx_stone','jx_sale','jx_sale_item','jx_order',
    'jx_order_item','jx_old_gold','jx_worker_txn','jx_repair','jx_gold_ledger'
  ];
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

COMMIT;

-- Make PostgREST aware of the new tables immediately.
NOTIFY pgrst, 'reload schema';
