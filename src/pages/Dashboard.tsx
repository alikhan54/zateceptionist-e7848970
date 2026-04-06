import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Phone,
  CreditCard,
  Flame,
  Mail,
  Linkedin,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function StatCard({ title, value, change, icon, isLoading }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {change !== 0 && (
          <div className="flex items-center text-xs mt-1">
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-destructive mr-1" />
            )}
            <span className={isPositive ? 'text-green-500' : 'text-destructive'}>
              {Math.abs(change)}%
            </span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI Agent Status Component
function AIAgentStatus({ name, status, actions, enabled }: { name: string; status: 'active' | 'idle' | 'error'; actions: number; enabled: boolean }) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-muted-foreground',
    error: 'bg-destructive',
  };
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${statusColors[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={enabled ? "secondary" : "outline"} className="text-xs">
          {enabled ? `${actions} actions` : 'disabled'}
        </Badge>
      </div>
    </div>
  );
}

// Voice AI Dashboard Widget
function VoiceWidget({ tenantId, navigate }: { tenantId: string | null; navigate: (path: string) => void }) {
  const { data: voiceData } = useQuery({
    queryKey: ['dashboard-voice-widget', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const today = new Date().toISOString().split('T')[0];
      const [usageRes, creditsRes] = await Promise.all([
        supabase
          .from('voice_usage')
          .select('duration_seconds, call_status')
          .eq('tenant_id', tenantId)
          .gte('started_at', today + 'T00:00:00'),
        supabase
          .from('voice_credits')
          .select('balance_minutes')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]);
      const calls = usageRes.data || [];
      return {
        callsToday: calls.length,
        talkTime: calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0),
        creditsMin: creditsRes.data ? Number(creditsRes.data.balance_minutes || 0) : null,
      };
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  if (!voiceData || (voiceData.callsToday === 0 && voiceData.creditsMin === null)) return null;

  const fmtDur = (s: number) => {
    if (!s) return '0m';
    const m = Math.floor(s / 60);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  return (
    <Card className="animate-fade-in bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate('/communications/voice-calls')}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-800">Voice AI Today</h3>
              <div className="flex items-center gap-4 text-sm text-indigo-600">
                <span>{voiceData.callsToday} call{voiceData.callsToday !== 1 ? 's' : ''}</span>
                <span>{fmtDur(voiceData.talkTime)} talk time</span>
                {voiceData.creditsMin !== null && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> {voiceData.creditsMin.toFixed(0)}m credits
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge className="bg-indigo-500 text-white">View Calls →</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { tenantConfig, tenantId, t } = useTenant();
  const [aiAutonomousMode, setAiAutonomousMode] = useState(false);
  const navigate = useNavigate();

  // Debug logging for tenant assignment
  console.log('[Dashboard] Current tenant:', {
    tenantId: tenantId,
    uuid: tenantConfig?.id,
    company_name: tenantConfig?.company_name
  });

  // REAL STATS - Query actual database counts
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-main-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const [customersRes, conversationsRes, appointmentsRes, leadsRes] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantConfig?.id || ''),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['scheduled', 'confirmed', 'pending']),
        supabase.from('sales_leads').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
      ]);
      
      return {
        customers: customersRes.count || 0,
        conversations: conversationsRes.count || 0,
        appointments: appointmentsRes.count || 0,
        leads: leadsRes.count || 0
      };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // Build stats array from real data
  const stats = [
    {
      title: `Total ${t('customers')}`,
      value: (statsData?.customers || 0).toLocaleString(),
      change: 0,
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Conversations',
      value: (statsData?.conversations || 0).toLocaleString(),
      change: 0,
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: t('appointments'),
      value: (statsData?.appointments || 0).toLocaleString(),
      change: 0,
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: `Active ${t('leads')}`,
      value: (statsData?.leads || 0).toLocaleString(),
      change: 0,
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ];

  // AI AGENTS - Use real ai_modules_enabled from tenant config
  const aiModules = tenantConfig?.features as Record<string, boolean> | null;
  const aiAgents: { name: string; status: 'active' | 'idle' | 'error'; actions: number; enabled: boolean }[] = [
    { 
      name: 'Sales AI', 
      status: aiModules?.sales_module !== false ? 'active' : 'idle',
      actions: 0,
      enabled: aiModules?.sales_module !== false
    },
    { 
      name: 'Marketing AI', 
      status: aiModules?.marketing_module !== false ? 'active' : 'idle',
      actions: 0,
      enabled: aiModules?.marketing_module !== false
    },
    { 
      name: 'HR AI', 
      status: aiModules?.hr_module === true ? 'active' : 'idle',
      actions: 0,
      enabled: aiModules?.hr_module === true
    },
    { 
      name: 'Support AI', 
      status: aiModules?.communications_module !== false ? 'active' : 'idle',
      actions: 0,
      enabled: aiModules?.communications_module !== false
    },
  ];

  // AI INSIGHTS - Generate from real data
  const aiSuggestions = useMemo(() => {
    const suggestions: { type: 'insight' | 'opportunity' | 'warning' | 'tip'; message: string }[] = [];
    
    if (statsData?.leads && statsData.leads > 0) {
      suggestions.push({ 
        type: 'insight', 
        message: `${statsData.leads} active leads in your pipeline` 
      });
    }
    
    if (statsData?.appointments && statsData.appointments > 0) {
      suggestions.push({ 
        type: 'opportunity', 
        message: `${statsData.appointments} upcoming appointments scheduled` 
      });
    }
    
    if (statsData?.conversations && statsData.conversations > 0) {
      suggestions.push({ 
        type: 'insight', 
        message: `${statsData.conversations} total conversations across channels` 
      });
    }
    
    // If no data, show onboarding tips
    if (suggestions.length === 0) {
      suggestions.push({ 
        type: 'tip', 
        message: 'Import leads to see AI-powered insights' 
      });
      suggestions.push({ 
        type: 'tip', 
        message: 'Connect WhatsApp or email to enable AI conversations' 
      });
    }
    
    return suggestions;
  }, [statsData]);

  // RECENT CONVERSATIONS - Query real data
  const { data: recentConversations } = useQuery({
    queryKey: ['dashboard-recent-conversations', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      
      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          channel,
          last_message_text,
          last_message_at,
          contact_id
        `)
        .eq('tenant_id', tenantConfig.id)
        .order('last_message_at', { ascending: false })
        .limit(5);
      
      if (!data || data.length === 0) return [];

      // Fetch customer names for these conversations
      const contactIds = data.map(c => c.contact_id).filter(Boolean);
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email')
        .in('id', contactIds);

      const customerMap = new Map(customers?.map(c => [c.id, c]) || []);

      return data.map(conv => ({
        ...conv,
        customer: customerMap.get(conv.contact_id) || null
      }));
    },
    enabled: !!tenantConfig?.id,
  });

  // UPCOMING APPOINTMENTS - Query real data  
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['dashboard-upcoming-appointments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data } = await supabase
        .from('appointments')
        .select(`
          id,
          service_name,
          customer_name,
          scheduled_at,
          start_time,
          customer_id
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed', 'pending'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);
      
      if (!data || data.length === 0) return [];

      // Fetch customer names
      const customerIds = data.map(a => a.customer_id).filter(Boolean);
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds);

      const customerMap = new Map(customers?.map(c => [c.id, c]) || []);

      return data.map(apt => ({
        ...apt,
        customer: customerMap.get(apt.customer_id) || null
      }));
    },
    enabled: !!tenantId,
  });

  // ============================================================
  // AI INTELLIGENCE — Hot leads, signals, multichannel activity
  // All three tables use SLUG-format tenant_id (sales_leads,
  // lead_signals, multichannel_outreach)
  // ============================================================

  // Hot leads (intent_score >= 40, top 5 by score DESC)
  const { data: hotLeads = [] } = useQuery({
    queryKey: ['dashboard-hot-leads', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('sales_leads')
        .select('id, company_name, contact_name, intent_score')
        .eq('tenant_id', tenantId)
        .neq('status', 'disqualified')
        .gte('intent_score', 40)
        .order('intent_score', { ascending: false })
        .limit(5);
      if (error) {
        console.error('[Dashboard] hot-leads error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Recent signals (funding/hiring) — top 5 by detected_at DESC
  const { data: signals = [] } = useQuery({
    queryKey: ['dashboard-recent-signals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('lead_signals')
        .select('id, signal_type, company_name, title, detected_at')
        .eq('tenant_id', tenantId)
        .order('detected_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('[Dashboard] lead_signals error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Channel activity counts from multichannel_outreach
  // Channel values in DB: 'sms', 'whatsapp', 'linkedin_view', and 'email' (if logged)
  const { data: channelActivity = [] } = useQuery({
    queryKey: ['dashboard-channel-activity', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('multichannel_outreach')
        .select('channel, status')
        .eq('tenant_id', tenantId);
      if (error) {
        console.error('[Dashboard] multichannel_outreach error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const channelCounts = useMemo(() => {
    const c = { email: 0, linkedin: 0, sms: 0, whatsapp: 0 };
    for (const row of channelActivity as Array<{ channel?: string | null; status?: string | null }>) {
      if (row.status !== 'sent') continue; // count only successful sends
      const ch = row.channel || '';
      if (ch === 'email') c.email += 1;
      else if (ch === 'linkedin' || ch === 'linkedin_view') c.linkedin += 1;
      else if (ch === 'sms') c.sms += 1;
      else if (ch === 'whatsapp') c.whatsapp += 1;
    }
    return c;
  }, [channelActivity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {tenantConfig?.company_name || 'Your Business'}
        </p>
        {/* Debug info - remove in production */}
        <p className="text-xs text-muted-foreground/50 mt-1">
          Tenant: {tenantId} | UUID: {tenantConfig?.id?.slice(0, 8)}...
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} isLoading={statsLoading} />
        ))}
      </div>

      {/* Voice AI Widget */}
      <VoiceWidget tenantId={tenantId} navigate={navigate} />

      {/* AI Command Center + Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* AI Command Center */}
        <Card className="lg:col-span-1 animate-fade-in border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Command Center
              </CardTitle>
              <Badge variant={aiAutonomousMode ? 'default' : 'secondary'} className="text-xs">
                {aiAutonomousMode ? 'Autonomous' : 'Assisted'}
              </Badge>
            </div>
            <CardDescription>AI agents status & actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${aiAutonomousMode ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">Autonomous Mode</span>
              </div>
              <Switch 
                checked={aiAutonomousMode} 
                onCheckedChange={setAiAutonomousMode}
              />
            </div>

            {/* Agent Statuses */}
            <div className="divide-y">
              {aiAgents.map((agent) => (
                <AIAgentStatus key={agent.name} {...agent} />
              ))}
            </div>

            {/* Today's Summary */}
            <div className="pt-2 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {(statsData?.conversations || 0) + (statsData?.leads || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Activity</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{statsData?.appointments || 0}</p>
                  <p className="text-xs text-muted-foreground">Booked Today</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>What AI learned today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {suggestion.type === 'opportunity' && (
                    <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  )}
                  {suggestion.type === 'warning' && (
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  {suggestion.type === 'insight' && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  {suggestion.type === 'tip' && (
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm">{suggestion.message}</p>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" size="sm">
              View All Insights
            </Button>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Latest messages from all channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConversations && recentConversations.length > 0 ? (
                recentConversations.map((conv) => (
                  <div key={conv.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.customer?.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conv.customer?.name || 'Unknown Contact'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message_text || 'No messages yet'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {conv.last_message_at 
                        ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                        : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Messages will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <CardTitle>Upcoming {t('appointments')}</CardTitle>
          <CardDescription>Your schedule for today</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {apt.service_name || `Meeting with ${apt.customer?.name || apt.customer_name || 'Client'}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {apt.scheduled_at 
                        ? format(new Date(apt.scheduled_at), 'MMM d, h:mm a')
                        : apt.start_time || 'Time TBD'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No upcoming appointments scheduled</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Intelligence Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Intelligence
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Hot Leads */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Hot Leads
              </CardTitle>
              <CardDescription>Intent score ≥ 40</CardDescription>
            </CardHeader>
            <CardContent>
              {hotLeads.length > 0 ? (
                <div className="space-y-2">
                  {hotLeads.slice(0, 5).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium truncate mr-2">
                        {lead.company_name || lead.contact_name || 'Unknown'}
                      </span>
                      <Badge
                        className={`text-white shrink-0 ${
                          (lead.intent_score ?? 0) >= 70
                            ? 'bg-red-500'
                            : (lead.intent_score ?? 0) >= 40
                            ? 'bg-orange-500'
                            : 'bg-yellow-500'
                        }`}
                      >
                        {lead.intent_score}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hot leads yet. Signals accumulate over time.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Signals */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Recent Signals
              </CardTitle>
              <CardDescription>Funding & hiring intent</CardDescription>
            </CardHeader>
            <CardContent>
              {signals.length > 0 ? (
                <div className="space-y-2">
                  {signals.slice(0, 5).map((s) => (
                    <div key={s.id} className="text-sm">
                      <span
                        className={
                          s.signal_type === 'funding'
                            ? 'text-green-500 font-medium'
                            : 'text-blue-500 font-medium'
                        }
                      >
                        {s.signal_type === 'funding' ? '💰' : '👥'} {s.company_name || 'Unknown'}
                      </span>
                      {s.title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {s.title}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Signals scan every 6–8 hours.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Channel Activity */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Channel Activity
              </CardTitle>
              <CardDescription>Multichannel outreach (sent)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{channelCounts.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Linkedin className="w-3 h-3" />
                  <span className="text-muted-foreground">LinkedIn:</span>
                  <span className="font-medium">{channelCounts.linkedin}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span className="text-muted-foreground">SMS:</span>
                  <span className="font-medium">{channelCounts.sms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-medium">{channelCounts.whatsapp}</span>
                </div>
              </div>
              {channelActivity.length === 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  No outreach activity logged yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
