import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bot, ArrowLeft, Phone, MessageSquare, Mail, Globe,
  Play, Pause, XCircle, Settings, Activity, Clock,
  Zap, CheckCircle
} from "lucide-react";
import { useAIAgent, useUpdateAgent, useAgentTasks } from "@/hooks/useAIAgents";
import { format } from "date-fns";

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
  const { data: agent, isLoading } = useAIAgent(id);
  const { data: tasks = [] } = useAgentTasks(id);
  const updateAgent = useUpdateAgent();

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

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'terminated') => {
    await updateAgent.mutateAsync({
      id: agent.id,
      status: newStatus,
      ...(newStatus === 'active' && !agent.hired_at ? { hired_at: new Date().toISOString() } : {}),
      ...(newStatus === 'terminated' ? { terminated_at: new Date().toISOString() } : {}),
    });
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
          {agent.status === 'draft' && (
            <Button onClick={() => handleStatusChange('active')} className="gap-2">
              <Play className="h-4 w-4" /> Activate
            </Button>
          )}
          {agent.status === 'active' && (
            <Button variant="outline" onClick={() => handleStatusChange('paused')} className="gap-2">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {agent.status === 'paused' && (
            <Button onClick={() => handleStatusChange('active')} className="gap-2">
              <Play className="h-4 w-4" /> Resume
            </Button>
          )}
          {agent.status !== 'terminated' && (
            <Button variant="destructive" onClick={() => handleStatusChange('terminated')} className="gap-2">
              <XCircle className="h-4 w-4" /> Terminate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
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
