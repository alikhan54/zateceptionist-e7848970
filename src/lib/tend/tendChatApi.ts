/* ============================================================================
   Tend — member chat API helpers (ADDITIVE; tend-only).
   Member side (/tend/me):
   - reads go DIRECT to Supabase under the member's OWN authed session
     (member_select_own RLS — a member can only ever see their own thread/messages);
   - writes go ONLY through the n8n bridge POST /tend-chat (there is NO member
     INSERT policy in the DB — the crisis gate is structurally unbypassable).
   Staff side (/tend-ops/conversations):
   - reads under staff tenant RLS; replies are DIRECT authed INSERTs
     (staff_insert policy), takeover is a thread UPDATE (staff_update policy).
   Realtime: per-thread postgres_changes INSERT subscription (same pattern as
   useInbox.ts) — RLS filters events server-side.
   ============================================================================ */
import { supabase, N8N_WEBHOOK_BASE } from "@/integrations/supabase/client";

export type SenderKind = "member" | "thera" | "staff" | "system";

export interface ChatThread {
  id: string;
  tenant_id: string;
  member_id: string;
  status: string;
  staff_takeover: boolean;
  takeover_by: string | null;
  takeover_at: string | null;
  conversation_ref: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  crisis_last_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  tenant_id: string;
  thread_id: string;
  sender_kind: SenderKind;
  sender_user_id: string | null;
  content: string;
  crisis_flag: boolean;
  client_msg_id: string | null;
  created_at: string;
}

export type BridgeState =
  | "ok"
  | "crisis"
  | "with_care_team"
  | "gate_unavailable"
  | "thera_error"
  | "invalid";

export interface BridgeResponse {
  state: BridgeState;
  reply?: string;
  response?: string; // crisis template text
  detection?: string;
  crisis_event_id?: string | null;
  member_message_id?: string;
  reply_message_id?: string;
  conversation_id?: string | null;
  error?: string;
}

/** THERA replies carry a "**[THERA …]**" identity prefix — strip for display only. */
export function stripTheraPrefix(text: string): string {
  return text.replace(/^\s*\*{0,2}\[THERA[^\]]*\]\*{0,2}\s*/i, "").trim();
}

export function newClientMsgId(): string {
  return (
    (crypto as any)?.randomUUID?.() ||
    "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12)
  );
}

/* ----------------------------- member side ----------------------------- */

/** The logged-in member's own telehealth_members row (RLS: own row or nothing). */
export async function fetchOwnMember(): Promise<{ id: string; full_name: string | null } | null> {
  const { data, error } = await supabase
    .from("telehealth_members")
    .select("id, full_name")
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as any;
}

/** The member's single ongoing thread (RLS returns only their own). */
export async function fetchOwnThread(): Promise<ChatThread | null> {
  const { data, error } = await supabase
    .from("telehealth_chat_threads")
    .select("*")
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as ChatThread;
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("telehealth_chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as ChatMessage[];
}

/** Latest routing decision for the member (member_select_own RLS) — "your next step". */
export async function fetchLatestRouting(): Promise<{ lane: string; created_at: string } | null> {
  const { data, error } = await supabase
    .from("telehealth_routing_decisions")
    .select("lane, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as any;
}

/**
 * Member send — the ONLY member write path (bridge). The bridge persists the
 * message, runs the MANDATORY crisis gate (fail-closed), then THERA / takeover.
 * Long timeout: THERA on-box can take ~30-150s.
 */
export async function sendChatMessage(
  memberId: string,
  message: string,
  clientMsgId: string,
): Promise<BridgeResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  try {
    const r = await fetch(`${N8N_WEBHOOK_BASE}/tend-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: "tend",
        member_id: memberId,
        message,
        client_msg_id: clientMsgId,
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { state: "gate_unavailable" };
    const d: any = await r.json();
    if (d && typeof d.state === "string") return d as BridgeResponse;
    return { state: "gate_unavailable" };
  } catch {
    // network/timeout — caller retries with the SAME clientMsgId (no duplicate row)
    return { state: "gate_unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

/** Realtime INSERTs for one thread. RLS scopes what each session can receive. */
export function subscribeThreadMessages(
  threadId: string,
  onInsert: (msg: ChatMessage) => void,
) {
  const channel = supabase
    .channel(`tend-chat-${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "telehealth_chat_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload: any) => onInsert(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/* ------------------------------ staff side ------------------------------ */

export async function fetchAllThreads(): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from("telehealth_chat_threads")
    .select("*")
    .eq("tenant_id", "tend")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error || !data) return [];
  return data as ChatThread[];
}

export async function fetchMembersByIds(
  ids: string[],
): Promise<Record<string, { id: string; full_name: string | null; state_us: string | null }>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("telehealth_members")
    .select("id, full_name, state_us")
    .in("id", ids);
  const map: Record<string, any> = {};
  (data || []).forEach((m: any) => (map[m.id] = m));
  return map;
}

/** Staff reply — DIRECT authed INSERT (staff_insert policy enforces sender identity). */
export async function staffSendMessage(
  threadId: string,
  content: string,
  staffUserId: string,
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from("telehealth_chat_messages")
    .insert({
      tenant_id: "tend",
      thread_id: threadId,
      sender_kind: "staff",
      sender_user_id: staffUserId,
      content,
    })
    .select()
    .single();
  if (error) return null;
  // keep the inbox ordering fresh (staff_update policy)
  await supabase
    .from("telehealth_chat_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 80),
    })
    .eq("id", threadId);
  return data as ChatMessage;
}

/** Take-over toggle. THERA is suppressed while ON; the crisis gate ALWAYS runs. */
export async function setTakeover(
  threadId: string,
  on: boolean,
  staffUserId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("telehealth_chat_threads")
    .update({
      staff_takeover: on,
      takeover_by: on ? staffUserId : null,
      takeover_at: on ? new Date().toISOString() : null,
    })
    .eq("id", threadId);
  if (error) return false;
  // honest, member-visible note (staff_insert policy ⇒ sender_kind must be 'staff')
  await staffSendMessage(
    threadId,
    on
      ? "A member of your care team has joined the conversation."
      : "Your care team has stepped back — THERA is here with you again.",
    staffUserId,
  );
  return true;
}
