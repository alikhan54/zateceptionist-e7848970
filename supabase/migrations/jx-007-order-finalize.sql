-- ============================================================================
-- jx-007-order-finalize.sql — wire custom orders into the GL (Project JX, Phase 8b)
-- Additive: 1 column + REPLACE jx_create_order (adds advance voucher) + new
-- jx_finalize_order. jx_create_sale is NOT modified (finalization reuses it as-is).
-- slug-keyed / RLS / SECURITY INVOKER. All money client-computed via calc.ts.
-- Rollback: DROP FUNCTION jx_finalize_order; restore jx_create_order from
-- .tmp_jx/jx_create_order_p7.bak.sql; the added column may stay (nullable, unused).
-- Apply via DIRECT 5432.
-- ============================================================================

ALTER TABLE public.jx_order
  ADD COLUMN IF NOT EXISTS finalized_sale_id UUID REFERENCES public.jx_sale(id) ON DELETE SET NULL;

-- ── REPLACE jx_create_order: Phase-7 behavior UNCHANGED + advance voucher ──
CREATE OR REPLACE FUNCTION public.jx_create_order(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $jx$
DECLARE
  v_tenant   text := get_user_tenant_id();
  v_order    jsonb := p_payload->'order';
  v_order_id uuid;
  v_order_no text;
  v_seq      int;
  v_line     jsonb;
  -- advance voucher
  v_advance numeric; v_adv_cash numeric; v_adv_card numeric; v_adv_cheque numeric;
  v_av_cash numeric; v_av_bank numeric; v_voucher_id uuid;
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN RAISE EXCEPTION 'jx_create_order: no tenant context'; END IF;

  SELECT COUNT(*) + 1 INTO v_seq FROM public.jx_order WHERE tenant_id = v_tenant;
  v_order_no := 'ORD-' || LPAD(v_seq::text, 5, '0');

  INSERT INTO public.jx_order (
    tenant_id, order_no, customer_id, salesman_id, order_date, delivery_date,
    is_fix_rate, fixed_rate, advance_amount, advance_tender, discount, net_amount, balance, status
  ) VALUES (
    v_tenant, v_order_no,
    NULLIF(v_order->>'customer_id','')::uuid, NULLIF(v_order->>'salesman_id','')::uuid,
    COALESCE((v_order->>'order_date')::timestamptz, now()), NULLIF(v_order->>'delivery_date','')::timestamptz,
    COALESCE((v_order->>'is_fix_rate')::boolean, false), NULLIF(v_order->>'fixed_rate','')::numeric,
    COALESCE((v_order->>'advance_amount')::numeric, 0), COALESCE(v_order->'advance_tender','{}'::jsonb),
    COALESCE((v_order->>'discount')::numeric, 0), (v_order->>'net_amount')::numeric,
    (v_order->>'balance')::numeric, COALESCE(v_order->>'status','booked')
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT jsonb_array_elements(COALESCE(p_payload->'lines','[]'::jsonb))
  LOOP
    INSERT INTO public.jx_order_item (
      tenant_id, order_id, item_id, tag_number, karat, net_weight, waste_pct,
      total_weight, making, polish, stone_value, line_total, assigned_worker_id, workshop_status
    ) VALUES (
      v_tenant, v_order_id, NULLIF(v_line->>'item_id','')::uuid, v_line->>'tag_number',
      (v_line->>'karat')::int, (v_line->>'net_weight')::numeric, COALESCE((v_line->>'waste_pct')::numeric,0),
      (v_line->>'total_weight')::numeric, COALESCE((v_line->>'making')::numeric,0), COALESCE((v_line->>'polish')::numeric,0),
      COALESCE((v_line->>'stone_value')::numeric,0), (v_line->>'line_total')::numeric,
      NULLIF(v_line->>'assigned_worker_id','')::uuid, COALESCE(v_line->>'workshop_status','pending')
    );
  END LOOP;

  -- NEW: advance receipt voucher (only if an advance was paid)
  v_advance := COALESCE((v_order->>'advance_amount')::numeric, 0);
  IF v_advance > 0.005 THEN
    v_adv_cash   := COALESCE((v_order->'advance_tender'->>'cash')::numeric, 0);
    v_adv_card   := COALESCE((v_order->'advance_tender'->>'card')::numeric, 0);
    v_adv_cheque := COALESCE((v_order->'advance_tender'->>'cheque')::numeric, 0);
    v_av_bank := round(v_adv_card + v_adv_cheque, 2);
    v_av_cash := round(v_adv_cash, 2);
    -- reconcile if tender breakdown doesn't sum to advance_amount → treat remainder as cash
    IF round(v_av_cash + v_av_bank, 2) <> round(v_advance, 2) THEN v_av_cash := round(v_advance - v_av_bank, 2); END IF;
    IF abs((v_av_cash + v_av_bank) - v_advance) > 0.01 THEN
      RAISE EXCEPTION 'jx_create_order: advance voucher unbalanced (dr=% cr=%)', (v_av_cash + v_av_bank), v_advance;
    END IF;

    INSERT INTO public.jx_voucher (tenant_id, type, voucher_date, narration, ref_table, ref_id)
    VALUES (v_tenant, 'advance', COALESCE((v_order->>'order_date')::timestamptz, now()), 'Advance ' || v_order_no, 'jx_order', v_order_id)
    RETURNING id INTO v_voucher_id;

    INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
      SELECT v_tenant, v_voucher_id, a.id, v_av_cash, 0 FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1000' AND v_av_cash > 0;
    INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
      SELECT v_tenant, v_voucher_id, a.id, v_av_bank, 0 FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1010' AND v_av_bank > 0;
    INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
      SELECT v_tenant, v_voucher_id, a.id, 0, v_advance FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='2000';
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_no', v_order_no);
END;
$jx$;

-- ── NEW: jx_finalize_order — order → real items → sale (clears advance) → mark delivered ──
CREATE OR REPLACE FUNCTION public.jx_finalize_order(p_order_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $jx$
DECLARE
  v_tenant text := get_user_tenant_id();
  v_order  public.jx_order%ROWTYPE;
  v_item   jsonb;
  v_item_id uuid;
  v_item_ids uuid[] := '{}';
  v_line   jsonb;
  v_lines  jsonb := '[]'::jsonb;
  v_idx    int := 0;
  v_sale_payload jsonb;
  v_res    jsonb;
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN RAISE EXCEPTION 'jx_finalize_order: no tenant context'; END IF;
  SELECT * INTO v_order FROM public.jx_order WHERE id = p_order_id AND tenant_id = v_tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'jx_finalize_order: order % not found for tenant', p_order_id; END IF;
  IF v_order.finalized_sale_id IS NOT NULL THEN RAISE EXCEPTION 'jx_finalize_order: order % already finalized', p_order_id; END IF;

  -- 1) create the delivered jx_item row(s) (status in_stock; jx_create_sale will mark sold)
  FOR v_item IN SELECT jsonb_array_elements(COALESCE(p_payload->'items','[]'::jsonb))
  LOOP
    INSERT INTO public.jx_item (
      tenant_id, metal, karat, tag_number, net_weight, gross_weight, stone_weight, pure_weight,
      waste_pct, making_type, making_value, lacquer_type, lacquer_value, item_for, status, description
    ) VALUES (
      v_tenant, COALESCE(v_item->>'metal','Gold'), (v_item->>'karat')::int, v_item->>'tag_number',
      (v_item->>'net_weight')::numeric, NULLIF(v_item->>'gross_weight','')::numeric, NULLIF(v_item->>'stone_weight','')::numeric,
      NULLIF(v_item->>'pure_weight','')::numeric, COALESCE((v_item->>'waste_pct')::numeric,0),
      COALESCE(v_item->>'making_type','fixed'), COALESCE((v_item->>'making_value')::numeric,0),
      COALESCE(v_item->>'lacquer_type','fixed'), COALESCE((v_item->>'lacquer_value')::numeric,0),
      'order', 'in_stock', v_item->>'description'
    ) RETURNING id INTO v_item_id;
    v_item_ids := array_append(v_item_ids, v_item_id);
  END LOOP;

  -- 2) attach the new item_ids to the sale lines (by index)
  FOR v_line IN SELECT jsonb_array_elements(COALESCE(p_payload->'lines','[]'::jsonb))
  LOOP
    v_idx := v_idx + 1;
    IF array_length(v_item_ids,1) IS NOT NULL AND v_idx <= array_length(v_item_ids,1) THEN
      v_line := v_line || jsonb_build_object('item_id', v_item_ids[v_idx]);
    END IF;
    v_lines := v_lines || jsonb_build_array(v_line);
  END LOOP;

  -- 3) finalize via the UNCHANGED jx_create_sale, applying the advance as prepaid
  v_sale_payload := jsonb_build_object('sale', p_payload->'sale', 'lines', v_lines, 'old_gold', COALESCE(p_payload->'old_gold','null'::jsonb));
  v_res := public.jx_create_sale(v_sale_payload, COALESCE(v_order.advance_amount, 0));

  -- 4) mark the order delivered + link the sale
  UPDATE public.jx_order SET status='delivered', finalized_sale_id=(v_res->>'sale_id')::uuid, updated_at=now()
  WHERE id = p_order_id AND tenant_id = v_tenant;

  RETURN v_res || jsonb_build_object('order_id', p_order_id, 'order_no', v_order.order_no);
END;
$jx$;

GRANT EXECUTE ON FUNCTION public.jx_create_order(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jx_finalize_order(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
