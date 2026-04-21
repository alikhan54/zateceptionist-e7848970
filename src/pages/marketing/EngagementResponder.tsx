import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle, Instagram, Facebook, Linkedin, Twitter,
  CheckCircle2, AlertCircle, UserCog, Clock, Zap, Send,
  ChevronDown, ChevronUp, Settings, Users,
} from 'lucide-react';

/* --- Types --- */

type ResponderStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'human_required'
  | 'skipped_spam'
  | 'skipped_disabled'
  | 'skipped_rate_limit_exceeded'
  | 'skipped_tenant_not_found'
  | 'skipped_missing_fields';

interface EngagementRow {
  id: string;
  tenant_id: string;
  tenant_uuid: string;
  platform: string;
  inbound_message_id: string | null;
  inbound_user_handle: string | null;
  inbound_text: string | null;
  inbound_context: Record<string, unknown> | null;
  intent: string | null;
  intent_confidence: number | null;
  response_text: string | null;
  response_status: ResponderStatus | null;
  response_channel: string | null;
  human_handoff_reason: string | null;
  lead_id: string | null;
  conversation_id: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface ResponderConfig {
  auto_respond?: boolean;
  response_delay_min_seconds?: number;
  response_delay_max_seconds?: number;
  human_handoff_triggers?: string[];
  max_responses_per_lead_per_day?: number;
  channels_enabled?: string[];
  channels_queued?: string[];
}

interface TenantConfigRow {
  id: string;
  engagement_responder_enabled: boolean | null;
  engagement_responder_config: ResponderConfig | null;
  fallback_dm_response: string | null;
  ai_name: string | null;
  company_name: string | null;
}

/* --- Helpers --- */

const PLATFORM_ICON: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
};

const statusColor = (s: ResponderStatus | null | undefined): string => {
  if (!s) return 'secondary';
  if (s === 'sent') return 'default';
  if (s === 'pending') return 'outline';
  if (s === 'failed') return 'destructive';
  if (s === 'human_required') return 'default';
  return 'secondary';
};

const statusLabel = (s: ResponderStatus | null | undefined): string => {
  if (!s) return 'unknown';
  return s.replace(/_/g, ' ');
};

const intentColor = (intent: string | null | undefined): string => {
  if (!intent) return 'secondary';
  if (intent === 'enterprise' || intent === 'support') return 'default';
  if (intent === 'spam') return 'destructive';
  if (intent === 'question' || intent === 'interest') return 'default';
  if (intent === 'objection') return 'outline';
  return 'secondary';
};

/* --- Component --- */

export default function EngagementResponder() {
  const { tenantId, tenantConfig } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();

  const responsesKey = useMemo(
    () => ['engagement-responses', tenantId] as const,
    [tenantId],
  );
  const configKey = useMemo(
    () => ['engagement-responder-config', tenantId] as const,
    [tenantId],
  );

  // Live feed of last 50 responses
  const {
    data: responses,
    isLoading: responsesLoading,
    error: responsesError,
  } = useQuery({
    queryKey: responsesKey,
    queryFn: async (): Promise<EngagementRow[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('engagement_responses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EngagementRow[];
    },
    refetchInterval: 60_000,
    enabled: !!tenantId,
  });

  // Tenant config + toggle
  const {
    data: tenantRow,
    isLoading: configLoading,
  } = useQuery({
    queryKey: configKey,
    queryFn: async (): Promise<TenantConfigRow | null> => {
      if (!tenantConfig?.id) return null;
      const { data, error } = await supabase
        .from('tenant_config')
        .select('id, engagement_responder_enabled, engagement_responder_config, fallback_dm_response, ai_name, company_name')
        .eq('id', tenantConfig.id)
        .maybeSingle();
      if (error) throw error;
      return data as TenantConfigRow | null;
    },
    enabled: !!tenantConfig?.id,
  });

  // Realtime subscription: invalidate responses on INSERT/UPDATE
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`engagement_responses_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_responses',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: responsesKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient, responsesKey]);

  const toggleEnabled = async (next: boolean) => {
    if (!tenantConfig?.id) return;
    await supabase
      .from('tenant_config')
      .update({ engagement_responder_enabled: next })
      .eq('id', tenantConfig.id);
    queryClient.invalidateQueries({ queryKey: configKey });
  };

  /* --- Derived stats (24h window) --- */
  const stats = useMemo(() => {
    const rows = responses || [];
    const now = Date.now();
    const cutoff = now - 24 * 3600 * 1000;
    const in24h = rows.filter(r => new Date(r.created_at).getTime() >= cutoff);
    const sent = in24h.filter(r => r.response_status === 'sent');
    const handoffs = in24h.filter(r => r.response_status === 'human_required');
    const leadsCreated = in24h.filter(r => r.lead_id).length;
    const avgSec = sent.length
      ? sent.reduce((acc, r) => {
          if (!r.sent_at) return acc;
          return acc + (new Date(r.sent_at).getTime() - new Date(r.created_at).getTime()) / 1000;
        }, 0) / sent.length
      : 0;
    const convRate = sent.length ? (leadsCreated / sent.length) * 100 : 0;
    return {
      sent24h: sent.length,
      handoffs24h: handoffs.length,
      avgResponseSec: Math.round(avgSec),
      leadsCreated24h: leadsCreated,
      convRate,
      totalFeed: rows.length,
    };
  }, [responses]);

  /* --- Expandable row state --- */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  /* --- Config dialog state --- */
  const [configOpen, setConfigOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<ResponderConfig>({});
  useEffect(() => {
    if (tenantRow?.engagement_responder_config) {
      setDraftConfig(tenantRow.engagement_responder_config);
    }
  }, [tenantRow?.engagement_responder_config]);

  const saveConfig = async () => {
    if (!tenantConfig?.id) return;
    await supabase
      .from('tenant_config')
      .update({ engagement_responder_config: draftConfig })
      .eq('id', tenantConfig.id);
    setConfigOpen(false);
    queryClient.invalidateQueries({ queryKey: configKey });
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading tenant...</p>
      </div>
    );
  }

  const enabled = !!tenantRow?.engagement_responder_enabled;
  const cfg = tenantRow?.engagement_responder_config || {};

  return (
    <div className="p-6 space-y-6">
      {/* --- Header + toggle --- */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Engagement Responder
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Auto-reply to inbound DMs, comments, and mentions across Instagram, Facebook, LinkedIn, and X.
            Qualify leads. Route enterprise inquiries to humans. Zero cold-outbound risk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card">
            <Switch
              checked={enabled}
              onCheckedChange={toggleEnabled}
              disabled={configLoading}
              aria-label="Toggle engagement responder"
            />
            <Label className="text-sm">
              {enabled ? 'Auto-respond ON' : 'Auto-respond OFF'}
            </Label>
          </div>
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Responder configuration</DialogTitle>
                <DialogDescription>
                  Tune delays, handoff triggers, and rate limits. Changes apply to the next inbound message.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Min delay (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draftConfig.response_delay_min_seconds ?? 30}
                      onChange={e =>
                        setDraftConfig(d => ({
                          ...d,
                          response_delay_min_seconds: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Max delay (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draftConfig.response_delay_max_seconds ?? 180}
                      onChange={e =>
                        setDraftConfig(d => ({
                          ...d,
                          response_delay_max_seconds: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Max responses per sender per day</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draftConfig.max_responses_per_lead_per_day ?? 3}
                    onChange={e =>
                      setDraftConfig(d => ({
                        ...d,
                        max_responses_per_lead_per_day: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Human-handoff trigger words (comma-separated)</Label>
                  <Textarea
                    rows={2}
                    value={(draftConfig.human_handoff_triggers || []).join(', ')}
                    onChange={e =>
                      setDraftConfig(d => ({
                        ...d,
                        human_handoff_triggers: e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Matching words trigger a human-required queue instead of auto-reply.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfigOpen(false)}>Cancel</Button>
                <Button onClick={saveConfig}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* --- Stats strip --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Responses 24h"
          value={stats.sent24h}
          icon={<Send className="h-4 w-4" />}
          loading={responsesLoading}
        />
        <StatCard
          title="Handoffs 24h"
          value={stats.handoffs24h}
          icon={<UserCog className="h-4 w-4" />}
          loading={responsesLoading}
        />
        <StatCard
          title="Avg response"
          value={`${stats.avgResponseSec}s`}
          icon={<Clock className="h-4 w-4" />}
          loading={responsesLoading}
        />
        <StatCard
          title="Leads created"
          value={stats.leadsCreated24h}
          icon={<Users className="h-4 w-4" />}
          loading={responsesLoading}
        />
        <StatCard
          title="Conversion rate"
          value={`${stats.convRate.toFixed(0)}%`}
          icon={<Zap className="h-4 w-4" />}
          loading={responsesLoading}
        />
      </div>

      {/* --- Channels state --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channels</CardTitle>
          <CardDescription>
            Auto-responding: {(cfg.channels_enabled || []).join(', ') || 'none'}.
            Queue-only (human required): {(cfg.channels_queued || []).join(', ') || 'none'}.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* --- Live feed --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live feed — last 50</CardTitle>
          <CardDescription>
            Real-time stream of inbound engagements + generated replies. Click a row to see full content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responsesError ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error loading responses: {(responsesError as Error).message}
            </div>
          ) : responsesLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (responses || []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No engagement events yet. When a DM, comment, or mention arrives, it will appear here.
            </div>
          ) : (
            <div className="space-y-1">
              {(responses || []).map(r => {
                const isOpen = !!expanded[r.id];
                const PIcon = PLATFORM_ICON[r.platform] || MessageCircle;
                return (
                  <div
                    key={r.id}
                    className="border rounded-md px-3 py-2 hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleRow(r.id)}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <PIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate min-w-[120px]">
                        @{r.inbound_user_handle || 'unknown'}
                      </span>
                      {r.intent && (
                        <Badge variant={intentColor(r.intent) as never} className="text-xs shrink-0">
                          {r.intent} {r.intent_confidence != null
                            ? `· ${(r.intent_confidence * 100).toFixed(0)}%`
                            : ''}
                        </Badge>
                      )}
                      <Badge variant={statusColor(r.response_status) as never} className="text-xs shrink-0">
                        {statusLabel(r.response_status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {(r.inbound_text || '').slice(0, 140)}
                    </div>
                    {isOpen && (
                      <div className="mt-3 pl-7 space-y-2 border-t pt-2">
                        <Detail label="Inbound">{r.inbound_text || '(empty)'}</Detail>
                        <Detail label="Response">
                          {r.response_text || <span className="italic text-muted-foreground">not generated</span>}
                        </Detail>
                        {r.human_handoff_reason && (
                          <Detail label="Handoff reason">{r.human_handoff_reason}</Detail>
                        )}
                        {r.error_message && (
                          <Detail label="Error">
                            <span className="text-destructive">{r.error_message}</span>
                          </Detail>
                        )}
                        {r.lead_id && (
                          <Detail label="Lead">
                            <code className="text-xs">{r.lead_id}</code>
                          </Detail>
                        )}
                        <div className="text-xs text-muted-foreground pt-1">
                          Created {new Date(r.created_at).toLocaleString()}
                          {r.sent_at && ` · Sent ${new Date(r.sent_at).toLocaleString()}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title, value, icon, loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="text-2xl font-semibold mt-1">
          {loading ? <Skeleton className="h-7 w-16" /> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mr-2">
        {label}:
      </span>
      <span className="whitespace-pre-wrap break-words">{children}</span>
    </div>
  );
}
