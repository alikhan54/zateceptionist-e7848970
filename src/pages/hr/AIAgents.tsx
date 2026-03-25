import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, Plus, Phone, MessageSquare, Mail, Globe,
  TrendingUp, Headphones, UserSearch, Megaphone,
  CalendarCheck, Banknote, Building, ClipboardList,
  UtensilsCrossed, Users, Zap, Activity
} from "lucide-react";
import { useAIAgents, useAgentTemplates, AIAgent, AIAgentTemplate } from "@/hooks/useAIAgents";

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
  instagram: Globe,
  facebook: Globe,
};

const templateIcons: Record<string, any> = {
  Phone: Phone,
  TrendingUp: TrendingUp,
  HeadphonesIcon: Headphones,
  UserSearch: UserSearch,
  Megaphone: Megaphone,
  CalendarCheck: CalendarCheck,
  Banknote: Banknote,
  Building: Building,
  ClipboardList: ClipboardList,
  UtensilsCrossed: UtensilsCrossed,
};

const tierColors: Record<string, string> = {
  starter: "bg-green-100 text-green-700",
  professional: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

export default function AIAgents() {
  const navigate = useNavigate();
  const { data: agents = [], isLoading } = useAIAgents();
  const { data: templates = [] } = useAgentTemplates();

  const activeCount = agents.filter(a => a.status === 'active').length;
  const totalCount = agents.length;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            AI Workforce
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount === 0
              ? "Hire AI agents to automate your business operations"
              : `${activeCount} active agent${activeCount !== 1 ? 's' : ''} out of ${totalCount}`
            }
          </p>
        </div>
        <Button onClick={() => navigate('/hr/ai-agents/hire')} className="gap-2">
          <Plus className="h-4 w-4" />
          Hire AI Agent
        </Button>
      </div>

      {/* Stats Row */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Hired</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">Tasks Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Bot className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI agents yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Hire your first AI employee to automate calls, messages, scheduling, and more.
              Choose from 10 pre-built templates below.
            </p>
            <Button onClick={() => navigate('/hr/ai-agents/hire')} className="gap-2">
              <Plus className="h-4 w-4" />
              Hire Your First AI Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onClick={() => navigate(`/hr/ai-agents/${agent.id}`)} />
          ))}
        </div>
      )}

      {/* Templates Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Available Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {templates.map((tmpl) => (
            <TemplateCard key={tmpl.id} template={tmpl} onClick={() => navigate('/hr/ai-agents/hire')} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: AIAgent; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={onClick}>
      <div className="h-1 bg-gradient-to-r from-primary to-primary/50 rounded-t-lg" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{agent.agent_name}</h3>
              <p className="text-sm text-muted-foreground">{agent.agent_title || agent.agent_role}</p>
            </div>
          </div>
          <Badge className={statusColors[agent.status] || statusColors.draft}>
            {agent.status}
          </Badge>
        </div>

        {/* Channels */}
        <div className="flex items-center gap-2 mt-3">
          {(agent.channels || []).map((ch) => {
            const Icon = channelIcons[ch] || Globe;
            return (
              <div key={ch} className="h-7 w-7 rounded bg-muted flex items-center justify-center" title={ch}>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        {/* Capabilities count */}
        <p className="text-xs text-muted-foreground mt-3">
          {(agent.capabilities || []).length} capabilities • {(agent.tools_enabled || []).length} tools
        </p>
      </CardContent>
    </Card>
  );
}

function TemplateCard({ template, onClick }: { template: AIAgentTemplate; onClick: () => void }) {
  const Icon = templateIcons[template.icon || ''] || Bot;
  return (
    <Card
      className="cursor-pointer hover:shadow-sm transition-shadow border-dashed hover:border-solid"
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h4 className="text-sm font-medium mb-1">{template.template_name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{template.description}</p>
        <Badge variant="outline" className={`text-[10px] ${tierColors[template.tier_required] || ''}`}>
          {template.tier_required}
        </Badge>
      </CardContent>
    </Card>
  );
}
