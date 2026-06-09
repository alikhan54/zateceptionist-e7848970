-- ============================================================================
-- jx-008-worker-txn.sql — Workshop / Karigar transactions (Project JX, Phase 9)
-- ONE additive RPC: jx_record_worker_txn(jsonb). SECURITY INVOKER (RLS applies),
-- atomic (single txn), tenant stamped via get_user_tenant_id(). Touches NO table
-- definition; only INSERTs into existing tables (jx_worker_txn, jx_gold_ledger,
-- jx_voucher, jx_voucher_line). Does NOT modify jx_create_sale / jx_create_order /
-- jx_finalize_order. All gram/money math is client-computed via calc.ts; the RPC
-- only persists + posts (with a defensive server-side fine_grams fallback).
--
-- Karigar accounting is CASH-BASIS (locked decision, Phase 9):
--   * issue_gold    → jx_worker_txn(type='issue')   + jx_gold_ledger OUT
--                     reason='issue_karigar'.  NO PKR voucher.
--   * receive_item  → jx_worker_txn(type='receive') + jx_gold_ledger IN
--                     reason='receive_karigar' (making_amount recorded as OWED).
--                     NO PKR voucher (making is expensed only when paid).
--   * making_payment→ jx_worker_txn(type='payment') + balanced jx_voucher
--                     type='making_payment': Dr 5100 Making Paid = Cr 1000 Cash.
-- Per-karigar gold balance = Σ issued fine − Σ received fine (computed in FE).
-- Per-karigar making payable = Σ receive making − Σ payments (computed in FE).
-- (Accrual via Karigar Payable 2200 deferred — see STATE_JEWELRY.md.)
--
-- Apply via DIRECT 5432 (primary). Pooler 6543 can route read-only (T18).
-- Rollback: DROP FUNCTION public.jx_record_worker_txn(jsonb);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.jx_record_worker_txn(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $jx$
DECLARE
  v_tenant    text := get_user_tenant_id();
  v_type      text := p_payload->>'type';
  v_worker    uuid := NULLIF(p_payload->>'worker_id','')::uuid;
  v_date      timestamptz := COALESCE((p_payload->>'txn_date')::timestamptz, now());
  v_karat     int := NULLIF(p_payload->>'karat','')::int;
  v_net       numeric := NULLIF(p_payload->>'net_grams','')::numeric;
  v_fine      numeric;
  v_making    numeric;
  v_item      uuid := NULLIF(p_payload->>'item_id','')::uuid;
  v_txn_id    uuid;
  v_ledger_id uuid;
  v_voucher_id uuid;
  v_dr        numeric;
  v_cr        numeric;
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN
    RAISE EXCEPTION 'jx_record_worker_txn: no tenant context';
  END IF;
  IF v_worker IS NULL THEN
    RAISE EXCEPTION 'jx_record_worker_txn: worker_id is required';
  END IF;

  -- ───────────────────────────────────────────────────────────────────────
  IF v_type = 'issue_gold' THEN
    IF v_net IS NULL OR v_net <= 0 THEN RAISE EXCEPTION 'jx_record_worker_txn: issue_gold needs net_grams > 0'; END IF;
    -- defensive fine_grams fallback = net * karat/24 (matches calc.ts goldLedgerFineGrams)
    v_fine := COALESCE(NULLIF(p_payload->>'fine_grams','')::numeric, round(v_net * COALESCE(v_karat,24) / 24.0, 3));

    INSERT INTO public.jx_worker_txn (tenant_id, worker_id, type, net_grams, karat, txn_date)
    VALUES (v_tenant, v_worker, 'issue', v_net, v_karat, v_date)
    RETURNING id INTO v_txn_id;

    INSERT INTO public.jx_gold_ledger (tenant_id, ledger_date, direction, reason, karat, net_grams, fine_grams, ref_table, ref_id)
    VALUES (v_tenant, v_date, 'out', 'issue_karigar', v_karat, v_net, v_fine, 'jx_worker_txn', v_txn_id)
    RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object('txn_id', v_txn_id, 'txn_type', 'issue', 'gold_ledger_id', v_ledger_id, 'fine_grams', v_fine);

  -- ───────────────────────────────────────────────────────────────────────
  ELSIF v_type = 'receive_item' THEN
    IF v_net IS NULL OR v_net <= 0 THEN RAISE EXCEPTION 'jx_record_worker_txn: receive_item needs net_grams > 0'; END IF;
    v_fine   := COALESCE(NULLIF(p_payload->>'fine_grams','')::numeric, round(v_net * COALESCE(v_karat,24) / 24.0, 3));
    v_making := COALESCE(NULLIF(p_payload->>'making_amount','')::numeric, 0);

    INSERT INTO public.jx_worker_txn (tenant_id, worker_id, type, net_grams, karat, making_amount, item_id, txn_date)
    VALUES (v_tenant, v_worker, 'receive', v_net, v_karat, v_making, v_item, v_date)
    RETURNING id INTO v_txn_id;

    INSERT INTO public.jx_gold_ledger (tenant_id, ledger_date, direction, reason, karat, net_grams, fine_grams, ref_table, ref_id)
    VALUES (v_tenant, v_date, 'in', 'receive_karigar', v_karat, v_net, v_fine, 'jx_worker_txn', v_txn_id)
    RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object('txn_id', v_txn_id, 'txn_type', 'receive', 'gold_ledger_id', v_ledger_id, 'fine_grams', v_fine, 'making_amount', v_making);

  -- ───────────────────────────────────────────────────────────────────────
  ELSIF v_type = 'making_payment' THEN
    v_making := COALESCE(NULLIF(p_payload->>'amount','')::numeric, NULLIF(p_payload->>'making_amount','')::numeric, 0);
    IF v_making <= 0 THEN RAISE EXCEPTION 'jx_record_worker_txn: making_payment needs amount > 0'; END IF;

    INSERT INTO public.jx_worker_txn (tenant_id, worker_id, type, making_amount, txn_date)
    VALUES (v_tenant, v_worker, 'payment', v_making, v_date)
    RETURNING id INTO v_txn_id;

    INSERT INTO public.jx_voucher (tenant_id, type, voucher_date, narration, ref_table, ref_id)
    VALUES (v_tenant, 'making_payment', v_date, 'Making payment ' || v_txn_id::text, 'jx_worker_txn', v_txn_id)
    RETURNING id INTO v_voucher_id;

    -- Dr 5100 Making Paid (expense); Cr 1000 Cash in Hand (asset).
    -- Lines are gated on account existence (missing code → no line → balance check fails → rollback).
    INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
      SELECT v_tenant, v_voucher_id, a.id, v_making, 0 FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='5100';
    INSERT INTO public.jx_voucher_line (tenant_id, voucher_id, account_id, debit, credit)
      SELECT v_tenant, v_voucher_id, a.id, 0, v_making FROM public.jx_account a WHERE a.tenant_id=v_tenant AND a.code='1000';

    -- enforce Σdebits = Σcredits from the ACTUAL inserted lines (catches missing COA)
    SELECT COALESCE(sum(debit),0), COALESCE(sum(credit),0) INTO v_dr, v_cr
      FROM public.jx_voucher_line WHERE voucher_id = v_voucher_id;
    IF abs(v_dr - v_cr) > 0.01 OR v_dr <= 0 THEN
      RAISE EXCEPTION 'jx_record_worker_txn: making_payment voucher unbalanced (debits=% credits=%)', v_dr, v_cr;
    END IF;

    RETURN jsonb_build_object('txn_id', v_txn_id, 'txn_type', 'payment', 'voucher_id', v_voucher_id, 'amount', v_making);

  ELSE
    RAISE EXCEPTION 'jx_record_worker_txn: unknown type "%" (expected issue_gold|receive_item|making_payment)', v_type;
  END IF;
END;
$jx$;

GRANT EXECUTE ON FUNCTION public.jx_record_worker_txn(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
