import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Bot, ArrowLeft, Phone, MessageSquare, Mail, Globe,
  Play, Pause, XCircle, Settings, Activity, Clock,
  Zap, CheckCircle, FileText, BookOpen, AlertTriangle,
  ChevronDown, ChevronUp, Send, Loader2, MessageCircle,
  BarChart3, PhoneCall, CalendarCheck, AlertOctagon
} from "lucide-react";
import { useAIAgent, useUpdateAgent, useAgentTasks, useAgentMetrics, useAgentConversations, useAgentSuggestions } from "@/hooks/useAIAgents";
import AgentKnowledgeEditor from "@/components/hr/AgentKnowledgeEditor";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  configuring: "bg-blue-100 text-blue-800",
  terminated: "bg-red-100 text-red-800",
};

const channelIcons: Record<string, any> = {
  voice: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  webchat: Globe,
  sms: MessageSquare,
};

export default function AIAgentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || "";
  const queryClient = useQueryClient();
  const { data: agent, isLoading } = useAIAgent(id);
  const { data: tasks = [] } = useAgentTasks(id);
  const updateAgent = useUpdateAgent();
  const { data: metrics = [] } = useAgentMetrics(id, 30);
  const { data: conversations = [] } = useAgentConversations(id);
  const { data: suggestions = [] } = useAgentSuggestions(id);
  const [showKB, setShowKB] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [kbSaving, setKbSaving] = useState(false);

  const perfSummary = useMemo(() => {
    if (!metrics?.length) return null;
    const totals = metrics.reduce((acc, m) => ({
      tasks: acc.tasks + (m.total_tasks || 0),
      calls: acc.calls + (m.calls_handled || 0),
      messages: acc.messages + (m.messages_handled || 0),
      appointments: acc.appointments + (m.appointments_booked || 0),
      escalations: acc.escalations + (m.escalations || 0),
    }), { tasks: 0, calls: 0, messages: 0, appointments: 0, escalations: 0 });
    const resRates = metrics.filter(m => m.resolution_rate != null);
    return {
      ...totals,
      resolutionRate: resRates.length > 0
        ? Math.round(resRates.reduce((s, m) => s + (m.resolution_rate || 0), 0) / resRates.length * 100)
        : null,
      daysActive: metrics.length,
    };
  }, [metrics]);

  const chartData = useMemo(() =>
    (metrics || []).map(m => ({ date: m.metric_date.slice(5), tasks: m.total_tasks })),
  [metrics]);

  // Chat test state
  const [testMessage, setTestMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 text-center py-20">
        <Bot className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold">Agent not found</h3>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/hr/ai-agents')}>
          Back to AI Workforce
        </Button>
      </div>
    );
  }

  const handleStatusChange = async (action: 'activate' | 'pause' | 'terminate') => {
    setActionLoading(true);
    try {
      const result = await callWebhook("/hr/ai-agent/activate", {
        agent_id: agent.id,
        action,
      }, tenantUuid);

      const data = result.data as any;
      const msg = data?.message || (result as any)?.message;
      if (data?.success || (result as any)?.success) {
        toast.success(msg || `Agent ${action}d`);
        queryClient.invalidateQueries({ queryKey: ['ai-agent'] });
        queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      } else {
        toast.error(data?.error || result.error || "Action failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
    setActionLoading(false);
  };

  const handleTestChat = async () => {
    if (!testMessage.trim()) return;
    const msg = testMessage.trim();
    setTestMessage("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);

    try {
      const result = await callWebhook("/hr/ai-agent/chat", {
        agent_id: agent.id,
        message: msg,
        contact_name: "Admin Test",
        session_id: `test-${Date.now()}`,
      }, tenantUuid);

      const data = result.data as any;
      const response = data?.response || (result as any)?.response || "No response";
      setChatMessages(prev => [...prev, { role: "agent", text: response }]);
      // Refresh tasks
      queryClient.invalidateQueries({ queryKey: ['ai-agent-tasks'] });
    } catch {
      setChatMessages(prev => [...prev, { role: "agent", text: "Error: Could not reach agent" }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hr/ai-agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.agent_name}</h1>
              <p className="text-muted-foreground">{agent.agent_title || agent.agent_role}</p>
            </div>
            <Badge className={`ml-2 ${statusColors[agent.status]}`}>{agent.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {(agent.status === 'draft' || agent.status === 'paused') && (
            <Button onClick={() => handleStatusChange('activate')} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {agent.status === 'draft' ? 'Activate' : 'Resume'}
            </Button>
          )}
          {agent.status === 'active' && (
            <Button variant="outline" onClick={() => handleStatusChange('pause')} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
              Pause
            </Button>
          )}
          {agent.status !== 'terminated' && (
            <Button variant="destructive" onClick={() => handleStatusChange('terminate')} disabled={actionLoading} className="gap-2">
              <XCircle className="h-4 w-4" /> Terminate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Chat — only when active */}
          {agent.status === 'active' && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" /> Test Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Chat messages */}
                {chatMessages.length > 0 && (
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {agent.agent_name} is typing...
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder={`Say something to ${agent.agent_name}...`}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleTestChat()}
                    disabled={chatLoading}
                  />
                  <Button size="icon" onClick={handleTestChat} disabled={chatLoading || !testMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {perfSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Performance — Last {perfSummary.daysActive} days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg bg-blue-50">
                    <p className="text-xl font-bold text-blue-700">{perfSummary.tasks}</p>
                    <p className="text-xs text-blue-600">Total Tasks</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-50">
                    <p className="text-xl font-bold text-green-700">{perfSummary.messages}</p>
                    <p className="text-xs text-green-600">Messages</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50">
                    <p className="text-xl font-bold text-purple-700">{perfSummary.calls}</p>
                    <p className="text-xs text-purple-600">Calls</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-xl font-bold text-amber-700">{perfSummary.appointments}</p>
                    <p className="text-xs text-amber-600">Appointments</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50">
                    <p className="text-xl font-bold text-red-700">{perfSummary.escalations}</p>
                    <p className="text-xs text-red-600">Escalations</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-50">
                    <p className="text-xl font-bold text-emerald-700">
                      {perfSummary.resolutionRate != null ? `${perfSummary.resolutionRate}%` : '—'}
                    </p>
                    <p className="text-xs text-emerald-600">Resolution</p>
                  </div>
                </div>
                {chartData.length > 1 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="tasks" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Active Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(agent.channels || []).map((ch) => {
                  const Icon = channelIcons[ch] || Globe;
                  return (
                    <div key={ch} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm capitalize">{ch}</span>
                    </div>
                  );
                })}
                {(!agent.channels || agent.channels.length === 0) && (
                  <p className="text-sm text-muted-foreground">No channels configured</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" /> Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(agent.capabilities || []).map((cap) => (
                  <Badge key={cap} variant="secondary">{cap.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tasks yet. Activate this agent to start processing tasks.
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{task.task_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.contact_name || 'Unknown'} • {task.channel || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {task.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(task.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Prompt */}
          {agent.system_prompt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                  {agent.system_prompt}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Knowledge Base Editor */}
          <AgentKnowledgeEditor
            agent={agent}
            isLoading={kbSaving}
            onSave={async (kb) => {
              setKbSaving(true);
              try {
                await updateAgent.mutateAsync({ id: agent.id, knowledge_base: kb });
                toast.success('Knowledge base saved');
              } catch { /* handled by mutation */ }
              setKbSaving(false);
            }}
          />

          {/* Conversations */}
          {conversations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Conversations ({conversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {conversations.slice(0, 15).map((conv) => (
                  <div key={conv.id}>
                    <div
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => setExpandedConvId(expandedConvId === conv.id ? null : conv.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{conv.channel || 'webchat'}</Badge>
                        <span className="text-sm">{conv.contact_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">({conv.message_count} msgs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.was_escalated && <Badge variant="destructive" className="text-[10px]">escalated</Badge>}
                        <span className="text-xs text-muted-foreground">{format(new Date(conv.created_at), 'MMM d, HH:mm')}</span>
                        {expandedConvId === conv.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </div>
                    </div>
                    {expandedConvId === conv.id && (
                      <div className="ml-4 space-y-2 py-2 border-l-2 pl-3 mb-2">
                        {(conv.messages || []).map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] px-3 py-1.5 rounded-lg text-xs ${
                              msg.role === 'customer' ? 'bg-muted' : 'bg-primary/10'
                            }`}>
                              <p className="font-medium text-[10px] mb-0.5 capitalize">{msg.role}</p>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Learning Suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Learning Suggestions
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">{suggestions.length} pending</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.map((sugg) => (
                  <div key={sugg.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{sugg.suggestion_type.replace(/_/g, ' ')}</Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-xs"
                          onClick={async () => {
                            // Apply suggestion to KB
                            const kb = { ...(agent.knowledge_base || {}) };
                            const content = sugg.suggestion_content;
                            if (content.suggested_faq) {
                              kb.faq = [...(kb.faq || []), content.suggested_faq];
                            }
                            if (content.suggested_policy) {
                              kb.policies = [...(kb.policies || []), content.suggested_policy];
                            }
                            await updateAgent.mutateAsync({ id: agent.id, knowledge_base: kb });
                            // Mark as accepted
                            await (await import('@/integrations/supabase/client')).supabase
                              .from('ai_agent_suggestions' as any)
                              .update({ status: 'accepted', applied_at: new Date().toISOString() })
                              .eq('id', sugg.id);
                            queryClient.invalidateQueries({ queryKey: ['ai-agent-suggestions'] });
                            toast.success('Suggestion applied');
                          }}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs"
                          onClick={async () => {
                            await (await import('@/integrations/supabase/client')).supabase
                              .from('ai_agent_suggestions' as any)
                              .update({ status: 'rejected' })
                              .eq('id', sugg.id);
                            queryClient.invalidateQueries({ queryKey: ['ai-agent-suggestions'] });
                            toast.success('Suggestion rejected');
                          }}>
                          Reject
                        </Button>
                      </div>
                    </div>
                    {sugg.suggestion_content.missing_knowledge && (
                      <p className="text-xs text-muted-foreground">{sugg.suggestion_content.missing_knowledge}</p>
                    )}
                    {sugg.suggestion_content.suggested_faq && (
                      <div className="text-xs">
                        <p className="font-medium">Q: {sugg.suggestion_content.suggested_faq.q}</p>
                        <p className="text-muted-foreground">A: {sugg.suggestion_content.suggested_faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Escalation Rules */}
          {agent.escalation_rules && (agent.escalation_rules as any).triggers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Escalation Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Escalation triggers:</p>
                  <div className="flex flex-wrap gap-1">
                    {((agent.escalation_rules as any).triggers || []).map((t: string) => (
                      <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
                {(agent.escalation_rules as any).message && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Escalation message:</p>
                    <p className="text-sm italic">"{(agent.escalation_rules as any).message}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">{agent.agent_role.replace(/_/g, ' ')}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Languages</p>
                <p className="text-sm">{(agent.languages || ['en']).join(', ')}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Max Concurrent</p>
                <p className="text-sm">{agent.max_concurrent_conversations} conversations</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Auto Follow-up</p>
                <p className="text-sm">{agent.auto_follow_up ? 'Enabled' : 'Disabled'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(agent.created_at), 'MMM d, yyyy')}</p>
              </div>
              {agent.hired_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Hired</p>
                    <p className="text-sm">{format(new Date(agent.hired_at), 'MMM d, yyyy')}</p>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Tools</p>
                <p className="text-sm">{(agent.tools_enabled || []).length} enabled</p>
              </div>
            </CardContent>
          </Card>

          {/* Personality */}
          {agent.personality && Object.keys(agent.personality).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(agent.personality).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-xs text-muted-foreground capitalize">{key}</span>
                    <span className="text-xs font-medium capitalize">{String(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
