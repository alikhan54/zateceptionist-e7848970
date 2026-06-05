-- ============================================================================
-- jx-006-create-sale-rpc-v2.sql — extend jx_create_sale to post a BALANCED GL voucher
-- (Project JX, Phase 8a). Same transaction as the sale: all Phase-6 steps UNCHANGED
-- (sale + items + old-gold + gold-ledger + mark-sold), PLUS an atomic double-entry
-- jx_voucher + jx_voucher_line with Σdebits = Σcredits enforced (RAISE EXCEPTION if off
-- by > 0.01 → whole sale rolls back). All money is client-computed via calc.ts; the RPC
-- only persists + posts. Adds p_prepaid_from_advance (default 0; used by Phase 8b).
--
-- Signature change: replaces jx_create_sale(jsonb) with jx_create_sale(jsonb, numeric
-- DEFAULT 0). PostgREST calls with only {p_payload} use the default. Prior (Phase-6)
-- definition backed up at D:/420-system/.tmp_jx/jx_create_sale_p6.bak.sql.
-- Rollback: DROP FUNCTION public.jx_create_sale(jsonb, numeric); then recreate the
-- 1-arg version from the backup. Apply via DIRECT 5432.
-- ============================================================================

DROP FUNCTION IF EXISTS public.jx_create_sale(jsonb);

CREATE OR REPLACE FUNCTION public.jx_create_sale(p_payload jsonb, p_prepaid_from_advance numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $jx$
DECLARE
  v_tenant   text := get_user_tenant_id();
  v_sale     jsonb := p_payload->'sale';
  v_sale_id  uuid;
  v_sale_no  text;
  v_seq      int;
  v_line     jsonb;
  v_old      jsonb := p_payload->'old_gold';
  -- line accumulators (for the credit side)
  v_sum_making numeric := 0; v_sum_polish numeric := 0; v_sum_stone numeric := 0; v_sum_line numeric := 0; v_sum_metal numeric := 0;
  -- voucher figures
  v_net_bill numeric; v_tax numeric; v_discount numeric; v_oldgold numeric;
  v_cash numeric; v_card numeric; v_cheque numeric; v_prepaid numeric;
  v_remainder numeric; v_shortfall numeric;
  v_cash_dr numeric; v_recv_dr numeric; v_bank_dr numeric; v_adv_dr numeric; v_disc_dr numeric; v_oldgold_dr numeric;
  v_goldsales_cr numeric; v_making_cr numeric; v_polish_cr numeric; v_stone_cr numeric; v_tax_cr numeric;
  v_dr numeric; v_cr numeric; v_voucher_id uuid;
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN RAISE EXCEPTION 'jx_create_sale: no tenant context'; END IF;

  SELECT COUNT(*) + 1 INTO v_seq FROM public.jx_sale WHERE tenant_id = v_tenant;
  v_sale_no := 'INV-' || LPAD(v_seq::text, 5, '0');

  -- ── sale header (Phase-6, unchanged) ──
  INSERT INTO public.jx_sale (
    tenant_id, sale_no, bill_book_no, customer_id, salesman_id, sale_date, gold_rate_snapshot,
    subtotal, discount, tax, old_gold_credit, net_bill,
    paid_cash, paid_card, paid_cheque, paid_used_gold_value, cash_balance, status
  ) VALUES (
    v_tenant, v_sale_no, v_sale->>'bill_book_no',
    NULLIF(v_sale->>'customer_id','')::uuid, NULLIF(v_sale->>'salesman_id','')::uuid,
    COALESCE((v_sale->>'sale_date')::timestamptz, now()), v_sale->'gold_rate_snapshot',
    (v_sale->>'subtotal')::numeric, COALESCE((v_sale->>'discount')::numeric,0), COALESCE((v_sale->>'tax')::numeric,0),
    COALESCE((v_sale->>'old_gold_credit')::numeric,0), (v_sale->>'net_bill')::numeric,
    COALESCE((v_sale->>'paid_cash')::numeric,0), COALESCE((v_sale->>'paid_card')::numeric,0),
    COALESCE((v_sale->>'paid_cheque')::numeric,0), COALESCE((v_sale->>'paid_used_gold_value')::numeric,0),
    (v_sale->>'cash_balance')::numeric, COALESCE(v_sale->>'status','completed')
  ) RETURNING id INTO v_sale_id;

  -- ── lines + gold-OUT + mark sold (Phase-6) + accumulate sums ──
  FOR v_line IN SELECT jsonb_array_elements(COALESCE(p_payload->'lines','[]'::jsonb))
  LOOP
    INSERT INTO public.jx_sale_item (
      tenant_id, sale_id, item_id, tag_number, karat, net_weight, waste_pct,
      total_weight, making, polish, stone_value, line_total
    ) VALUES (
      v_tenant, v_sale_id, NULLIF(v_line->>'item_id','')::uuid, v_line->>'tag_number',
      (v_line->>'karat')::int, (v_line->>'net_weight')::numeric, COALESCE((v_line->>'waste_pct')::numeric,0),
      (v_line->>'total_weight')::numeric, COALESCE((v_line->>'making')::numeric,0), COALESCE((v_line->>'polish')::numeric,0),
      COALESCE((v_line->>'stone_value')::numeric,0), (v_line->>'line_total')::numeric
    );

    v_sum_making := v_sum_making + COALESCE((v_line->>'making')::numeric,0);
    v_sum_polish := v_sum_polish + COALESCE((v_line->>'polish')::numeric,0);
    v_sum_stone  := v_sum_stone  + COALESCE((v_line->>'stone_value')::numeric,0);
    v_sum_line   := v_sum_line   + (v_line->>'line_total')::numeric;

    IF (v_line->>'fine_grams') IS NOT NULL THEN
      INSERT INTO public.jx_gold_ledger (tenant_id, ledger_date, direction, reason, karat, net_grams, fine_grams, ref_table, ref_id)
      VALUES (v_tenant, now(), 'out', 'sale', (v_line->>'karat')::int, (v_line->>'net_weight')::numeric, (v_line->>'fine_grams')::numeric, 'jx_sale', v_sale_id);
    END IF;
    IF NULLIF(v_line->>'item_id','') IS NOT NULL THEN
      UPDATE public.jx_item SET status='sold', updated_at=now() WHERE id=(v_line->>'item_id')::uuid AND tenant_id=v_tenant;
    END IF;
  END LOOP;
  v_sum_metal := round(v_sum_line - v_sum_making - v_sum_polish - v_sum_stone, 2);

  -- ── old gold (Phase-6) ──
  IF v_old IS NOT NULL AND v_old <> 'null'::jsonb THEN
    INSERT INTO public.jx_old_gold (tenant_id, customer_id, net_weight, karat, purity, rate, credit_value, linked_sale_id, zero_deduction)
    VALUES (v_tenant, NULLIF(v_sale->>'customer_id','')::uuid, (v_old->>'net_weight')::numeric, (v_old->>'karat')::int,
            NULLIF(v_old->>'purity','')::numeric, (v_old->>'rate')::numeric, (v_old->>'credit_value')::numeric, v_sale_id, COALESCE((v_old->>'zero_deduction')::boolean,false));
    INSERT INTO public.jx_gold_ledger (tenant_id, ledger_date, direction, reason, karat, net_grams, fine_grams, ref_table, ref_id)
    VALUES (v_tenant, now(), 'in', 'old_gold_in', (v_old->>'karat')::int, (v_old->>'net_weight')::numeric, (v_old->>'fine_grams')::numeric, 'jx_sale', v_sale_id);
  END IF;

  -- ── NEW: balanced double-entry sales voucher (same transaction) ──
  v_net_bill := (v_sale->>'net_bill')::numeric;
  v_tax      := COALESCE((v_sale->>'tax')::numeric,0);
  v_discount := COALESCE((v_sale->>'discount')::numeric,0);
  v_oldgold  := COALESCE((v_sale->>'old_gold_credit')::numeric,0);
  v_cash     := COALESCE((v_sale->>'paid_cash')::numeric,0);
  v_card     := COALESCE((v_sale->>'paid_card')::numeric,0);
  v_cheque   := COALESCE((v_sale->>'paid_cheque')::numeric,0);
  v_prepaid  := COALESCE(p_prepaid_from_advance,0);

  -- cash retained = net_bill − card − cheque − prepaid (change NOT posted); underpayment → receivable
  v_remainder := round(v_net_bill - v_card - v_cheque - v_prepaid, 2);
  v_shortfall := round(v_remainder - v_cash, 2);
  IF v_shortfall > 0.01 THEN v_cash_dr := v_cash; v_recv_dr := v_shortfall;
  ELSE v_cash_dr := v_remainder; v_recv_dr := 0; END IF;
  IF v_cash_dr < 0 THEN v_cash_dr := 0; END IF;   -- guard: non-cash over-covers (rare); excess change unposted
  v_bank_dr := v_card + v_cheque;
  v_adv_dr := v_prepaid;
  v_disc_dr := v_discount;
  v_oldgold_dr := v_oldgold;

  v_goldsales_cr := v_sum_metal;
  v_making_cr := v_sum_making;
  v_polish_cr := v_sum_polish;
  v_stone_cr := v_sum_stone;
  v_tax_cr := v_tax;

  v_dr := round(v_cash_dr + v_recv_dr + v_bank_dr + v_adv_dr + v_disc_dr + v_oldgold_dr, 2);
  v_cr := round(v_goldsales_cr + v_making_cr + v_polish_cr + v_stone_cr + v_tax_cr, 2);
  IF abs(v_dr - v_cr) > 0.01 THEN
    RAISE EXCEPTION 'jx_create_sale: voucher unbalanced (debits=% credits=%)', v_dr, v_cr;
  END IF;

  INSERT INTO public.jx_voucher (tenant_id, type, voucher_date, narration, ref_table, ref_id)
  VALUES (v_tenant, 'sales', COALESCE((v_sale->>'sale_date')::timestamptz, now()), 'Sale ' || v_sale_no, 'jx_sale', v_sale_id)
  RETURNING id INTO v_voucher_id;

  -- one line per nonzero amount; account looked up by code (missing code → no line → balance check fails)
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, v_cash_dr, 0    FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1000' AND v_cash_dr   > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, v_bank_dr, 0    FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1010' AND v_bank_dr   > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, v_adv_dr, 0     FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='2000' AND v_adv_dr    > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, v_recv_dr, 0    FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1200' AND v_recv_dr   > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, v_oldgold_dr, 0 FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1300' AND v_oldgold_dr> 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, v_disc_dr, 0    FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='5000' AND v_disc_dr   > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, 0, v_goldsales_cr FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='4000' AND v_goldsales_cr > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, 0, v_making_cr  FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='4100' AND v_making_cr > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, 0, v_polish_cr  FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='4200' AND v_polish_cr > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, 0, v_stone_cr   FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='4300' AND v_stone_cr > 0;
  INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
    SELECT v_tenant, v_voucher_id, a.id, 0, v_tax_cr     FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='2100' AND v_tax_cr > 0;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'sale_no', v_sale_no, 'voucher_id', v_voucher_id);
END;
$jx$;

GRANT EXECUTE ON FUNCTION public.jx_create_sale(jsonb, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
