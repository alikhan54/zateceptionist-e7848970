-- ============================================================================
-- jx-004-create-order-rpc.sql — atomic custom-Order write (Project JX, Phase 7)
-- Additive: one function, no table changes. Idempotent (CREATE OR REPLACE).
-- SECURITY INVOKER → RLS applies; tenant_id stamped get_user_tenant_id() everywhere.
-- SCOPE: records jx_order + jx_order_item ONLY. NO jx_gold_ledger, NO jx_create_sale,
-- NO vouchers — order→sale finalization + gold/GL posting is PHASE 8.
-- All money math is client-side via calc.ts; this RPC only persists atomically.
-- Rollback: DROP FUNCTION public.jx_create_order(jsonb);
-- Apply via DIRECT 5432 (primary).
-- ============================================================================

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
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN
    RAISE EXCEPTION 'jx_create_order: no tenant context';
  END IF;

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

  RETURN jsonb_build_object('order_id', v_order_id, 'order_no', v_order_no);
END;
$jx$;

GRANT EXECUTE ON FUNCTION public.jx_create_order(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
