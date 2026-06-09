-- ============================================================================
-- jx-003-create-sale-rpc.sql — atomic Point-of-Sale write (Project JX, Phase 6)
-- Additive: one function, no table changes. Idempotent (CREATE OR REPLACE).
-- SECURITY INVOKER → runs as the caller (authenticated) so RLS applies to every
-- insert/update; tenant_id is stamped get_user_tenant_id() everywhere.
-- All MONEY math is done client-side via calc.ts; this RPC only PERSISTS atomically
-- (whole function = one transaction → all-or-nothing) and derives sale_no + ledger rows.
-- PKR double-entry vouchers (jx_account/jx_voucher) are PHASE 8 — NOT here.
-- Rollback: DROP FUNCTION public.jx_create_sale(jsonb);
-- Apply via DIRECT 5432 (primary).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.jx_create_sale(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $jx$
DECLARE
  v_tenant  text := get_user_tenant_id();
  v_sale    jsonb := p_payload->'sale';
  v_sale_id uuid;
  v_sale_no text;
  v_seq     int;
  v_line    jsonb;
  v_old     jsonb := p_payload->'old_gold';
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN
    RAISE EXCEPTION 'jx_create_sale: no tenant context (get_user_tenant_id is null)';
  END IF;

  -- next per-tenant invoice number
  SELECT COUNT(*) + 1 INTO v_seq FROM public.jx_sale WHERE tenant_id = v_tenant;
  v_sale_no := 'INV-' || LPAD(v_seq::text, 5, '0');

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

  -- sale lines + gold-OUT ledger + mark item sold
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

    IF (v_line->>'fine_grams') IS NOT NULL THEN
      INSERT INTO public.jx_gold_ledger (tenant_id, ledger_date, direction, reason, karat, net_grams, fine_grams, ref_table, ref_id)
      VALUES (v_tenant, now(), 'out', 'sale', (v_line->>'karat')::int, (v_line->>'net_weight')::numeric,
              (v_line->>'fine_grams')::numeric, 'jx_sale', v_sale_id);
    END IF;

    IF NULLIF(v_line->>'item_id','') IS NOT NULL THEN
      UPDATE public.jx_item SET status = 'sold', updated_at = now()
      WHERE id = (v_line->>'item_id')::uuid AND tenant_id = v_tenant;
    END IF;
  END LOOP;

  -- old-gold trade-in (optional): credit row + gold-IN ledger
  IF v_old IS NOT NULL AND v_old <> 'null'::jsonb THEN
    INSERT INTO public.jx_old_gold (
      tenant_id, customer_id, net_weight, karat, purity, rate, credit_value, linked_sale_id, zero_deduction
    ) VALUES (
      v_tenant, NULLIF(v_sale->>'customer_id','')::uuid,
      (v_old->>'net_weight')::numeric, (v_old->>'karat')::int, NULLIF(v_old->>'purity','')::numeric,
      (v_old->>'rate')::numeric, (v_old->>'credit_value')::numeric, v_sale_id, COALESCE((v_old->>'zero_deduction')::boolean,false)
    );

    INSERT INTO public.jx_gold_ledger (tenant_id, ledger_date, direction, reason, karat, net_grams, fine_grams, ref_table, ref_id)
    VALUES (v_tenant, now(), 'in', 'old_gold_in', (v_old->>'karat')::int, (v_old->>'net_weight')::numeric,
            (v_old->>'fine_grams')::numeric, 'jx_sale', v_sale_id);
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'sale_no', v_sale_no);
END;
$jx$;

GRANT EXECUTE ON FUNCTION public.jx_create_sale(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
