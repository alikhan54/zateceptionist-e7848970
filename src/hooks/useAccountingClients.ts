import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type ClientStatus = "active" | "inactive" | "prospect";

export interface AccountingClientFull {
  id: string;
  tenant_id: string;
  name: string;
  company_no: string | null;
  vat_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: ClientStatus | string;
  data_status: string | null;
  beneficial_owner: string | null;
  jurisdiction: string | null;
  country_of_director: string | null;
  accounting_period_end: string | null;
  notes: string | null;
  status_notes: string | null;
  companies_house_last_synced_at: string | null;
  // Wave 2a Phase 1: full Companies House field set (already populated by the CH
  // sync workflow + enrichment; surfaced read-only in the UI).
  company_status: string | null;
  company_type: string | null;
  date_of_incorporation: string | null;
  accounts_next_due: string | null;
  accounts_last_made_up: string | null;
  confirmation_statement_next_due: string | null;
  confirmation_statement_last_made_up: string | null;
  sic_codes: string[] | null;
  registered_office_address: Record<string, unknown> | null;
  directors: Array<Record<string, unknown>> | null;
  companies_house_sync_status: string | null;
  // Wave 2b — MoneyPex client fields (migration 39)
  client_type: string | null;
  reference_no: string | null;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  partner_responsible: string | null;
  home_telephone: string | null;
  work_telephone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  post_code: string | null;
  county: string | null;
  country: string | null;
  date_joined: string | null;
  payee_reference_no: string | null;
  account_office_reference: string | null;
  vat_registration_date: string | null;
  balance: number | null;
  charges_quoted: number | null;
  ni_number: string | null;
  passport_mrz: string | null;
  gb_driving_licence: string | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  hmrc_utr: string | null;
  companies_house_auth_code: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientUpsertPayload {
  name: string;
  company_no?: string | null;
  vat_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  beneficial_owner?: string | null;
  status?: ClientStatus;
  jurisdiction?: string | null;
  accounting_period_end?: string | null;
  notes?: string | null;
  // Wave 2b — MoneyPex client fields (additive; hmrc_utr + companies_house_auth_code
  // are written plain and auto-encrypted by DB triggers into the *_encrypted columns).
  client_type?: string | null;
  reference_no?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  partner_responsible?: string | null;
  home_telephone?: string | null;
  work_telephone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  post_code?: string | null;
  county?: string | null;
  country?: string | null;
  date_joined?: string | null;
  payee_reference_no?: string | null;
  account_office_reference?: string | null;
  vat_registration_date?: string | null;
  balance?: number | null;
  charges_quoted?: number | null;
  ni_number?: string | null;
  passport_mrz?: string | null;
  gb_driving_licence?: string | null;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  hmrc_utr?: string | null;
  companies_house_auth_code?: string | null;
}

/**
 * Derive UK jurisdiction from Companies House CRN prefix.
 * Mirrors importer logic in `30-adil-real-data-importer.py`.
 *
 *   "SC..."  → GB-SCT
 *   "NI..." / "R..." → GB-NIR
 *   "OC..." or 8 digits → GB-ENG
 *   else → null (let user pick)
 */
export function jurisdictionFromCrn(crn: string | null | undefined): string | null {
  if (!crn) return null;
  const v = crn.trim().toUpperCase().replace(/\s+/g, "");
  if (!v) return null;
  if (v.startsWith("SC")) return "GB-SCT";
  if (v.startsWith("NI") || (v.startsWith("R") && /^R\d/.test(v))) return "GB-NIR";
  if (v.startsWith("OC")) return "GB-ENG";
  if (/^\d{8}$/.test(v)) return "GB-ENG";
  return null;
}

export function useAccountingClients() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ["accounting_clients_full", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from("accounting_clients")
        .select(
          "id, tenant_id, name, company_no, vat_number, contact_email, contact_phone, address, status, data_status, beneficial_owner, jurisdiction, country_of_director, accounting_period_end, notes, status_notes, companies_house_last_synced_at, company_status, company_type, date_of_incorporation, accounts_next_due, accounts_last_made_up, confirmation_statement_next_due, confirmation_statement_last_made_up, sic_codes, registered_office_address, directors, companies_house_sync_status, client_type, reference_no, first_name, last_name, gender, partner_responsible, home_telephone, work_telephone, address_line_1, address_line_2, city, post_code, county, country, date_joined, payee_reference_no, account_office_reference, vat_registration_date, balance, charges_quoted, ni_number, passport_mrz, gb_driving_licence, date_of_birth, date_of_death, hmrc_utr, companies_house_auth_code, created_by, updated_by, created_at, updated_at",
        )
        .eq("tenant_id", tenantId as string)
        .order("name");
      if (qErr) throw qErr;
      return (data ?? []) as unknown as AccountingClientFull[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`accounting_clients_full_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounting_clients",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["accounting_clients_full", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["accounting_clients_list", tenantId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const createClient = useMutation({
    mutationFn: async (payload: ClientUpsertPayload) => {
      if (!tenantId) throw new Error("No tenant context — cannot create client");
      const name = payload.name?.trim();
      if (!name) throw new Error("Client name is required");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      // Server-side dedup: if company_no provided, refuse duplicate
      if (payload.company_no?.trim()) {
        const cleanCrn = payload.company_no.trim().toUpperCase();
        const { data: existing, error: dupErr } = await supabase
          .from("accounting_clients")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .eq("company_no", cleanCrn)
          .maybeSingle();
        if (dupErr && dupErr.code !== "PGRST116") throw dupErr;
        if (existing) {
          throw new Error(`A client with company_no ${cleanCrn} already exists (${existing.name}).`);
        }
      }

      const row = {
        tenant_id: tenantId,
        name,
        company_no: payload.company_no?.trim().toUpperCase() || null,
        vat_number: payload.vat_number?.trim() || null,
        contact_email: payload.contact_email?.trim() || null,
        contact_phone: payload.contact_phone?.trim() || null,
        beneficial_owner: payload.beneficial_owner?.trim() || null,
        jurisdiction: payload.jurisdiction || jurisdictionFromCrn(payload.company_no) || null,
        accounting_period_end: payload.accounting_period_end || null,
        notes: payload.notes?.trim() || null,
        // Wave 2b — MoneyPex fields. hmrc_utr + companies_house_auth_code are written
        // plain; encrypt_hmrc_utr_trigger / encrypt_ch_auth_code_trigger populate *_encrypted.
        client_type: payload.client_type || null,
        reference_no: payload.reference_no?.trim() || null,
        first_name: payload.first_name?.trim() || null,
        last_name: payload.last_name?.trim() || null,
        gender: payload.gender || null,
        partner_responsible: payload.partner_responsible || null,
        home_telephone: payload.home_telephone?.trim() || null,
        work_telephone: payload.work_telephone?.trim() || null,
        address_line_1: payload.address_line_1?.trim() || null,
        address_line_2: payload.address_line_2?.trim() || null,
        city: payload.city?.trim() || null,
        post_code: payload.post_code?.trim() || null,
        county: payload.county?.trim() || null,
        country: payload.country?.trim() || null,
        date_joined: payload.date_joined || null,
        payee_reference_no: payload.payee_reference_no?.trim() || null,
        account_office_reference: payload.account_office_reference?.trim() || null,
        vat_registration_date: payload.vat_registration_date || null,
        balance: payload.balance ?? 0,
        charges_quoted: payload.charges_quoted ?? null,
        ni_number: payload.ni_number?.trim() || null,
        passport_mrz: payload.passport_mrz?.trim() || null,
        gb_driving_licence: payload.gb_driving_licence?.trim() || null,
        date_of_birth: payload.date_of_birth || null,
        date_of_death: payload.date_of_death || null,
        hmrc_utr: payload.hmrc_utr?.trim() || null,
        companies_house_auth_code: payload.companies_house_auth_code?.trim() || null,
        status: payload.status ?? "active",
        country_of_director: "GB",
        data_status: "complete",
        imported_from: "ui-add-client",
        created_by: userId,
        updated_by: userId,
      };

      const { data, error: insErr } = await supabase
        .from("accounting_clients")
        .insert(row as never)
        .select("*")
        .single();
      if (insErr) throw insErr;
      return data as unknown as AccountingClientFull;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_full", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_list", tenantId] });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ClientUpsertPayload> }) => {
      if (!tenantId) throw new Error("No tenant context");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const cleanPatch = {
        ...patch,
        company_no: patch.company_no != null ? (patch.company_no.trim().toUpperCase() || null) : undefined,
        jurisdiction:
          patch.jurisdiction ?? (patch.company_no ? jurisdictionFromCrn(patch.company_no) : undefined),
        updated_by: userId,
      };
      // Strip undefineds
      const finalPatch = Object.fromEntries(Object.entries(cleanPatch).filter(([, v]) => v !== undefined));

      const { data, error: updErr } = await supabase
        .from("accounting_clients")
        .update(finalPatch as never)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();
      if (updErr) throw updErr;
      return data as unknown as AccountingClientFull;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_full", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_list", tenantId] });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context");
      const { error: delErr } = await supabase
        .from("accounting_clients")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_full", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_list", tenantId] });
    },
  });

  return {
    clients,
    isLoading,
    error,
    refetch,
    createClient,
    updateClient,
    deleteClient,
  };
}
