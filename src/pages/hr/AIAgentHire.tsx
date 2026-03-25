import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot, ArrowLeft, Phone, TrendingUp, Headphones, UserSearch,
  Megaphone, CalendarCheck, Banknote, Building, ClipboardList,
  UtensilsCrossed, Search, Loader2
} from "lucide-react";
import { useAgentTemplates, useCreateAgent, AIAgentTemplate } from "@/hooks/useAIAgents";
import { toast } from "sonner";

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
  starter: "bg-green-100 text-green-700 border-green-200",
  professional: "bg-blue-100 text-blue-700 border-blue-200",
  enterprise: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AIAgentHire() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useAgentTemplates();
  const createAgent = useCreateAgent();
  const [search, setSearch] = useState("");
  const [hiringId, setHiringId] = useState<string | null>(null);

  const filtered = templates.filter(t =>
    !search ||
    t.template_name.toLowerCase().includes(search.toLowerCase()) ||
    t.template_role.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleHire = async (template: AIAgentTemplate) => {
    setHiringId(template.id);
    try {
      const agent = await createAgent.mutateAsync({
        agent_name: template.template_name.replace('AI ', ''),
        agent_role: template.template_role,
        agent_title: template.template_name,
        personality: template.default_personality,
        capabilities: template.default_capabilities,
        channels: template.default_channels,
        tools_enabled: template.default_tools,
        system_prompt: template.default_system_prompt,
        knowledge_base: template.default_knowledge_base || {},
        escalation_rules: template.default_escalation_rules || {},
      });
      toast.success(`${template.template_name} hired successfully!`);
      navigate(`/hr/ai-agents/${agent.id}`);
    } catch {
      // Error handled by mutation
    } finally {
      setHiringId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hr/ai-agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Hire an AI Agent</h1>
          <p className="text-muted-foreground">Choose a template to get started. You can customize everything after hiring.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-48" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((template) => {
            const Icon = templateIcons[template.icon || ''] || Bot;
            const isHiring = hiringId === template.id;
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{template.template_name}</h3>
                        <Badge variant="outline" className={`text-[10px] ${tierColors[template.tier_required] || ''}`}>
                          {template.tier_required}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.default_capabilities.slice(0, 4).map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-[10px]">
                            {cap.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {template.default_capabilities.length > 4 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{template.default_capabilities.length - 4}
                          </Badge>
                        )}
                      </div>

                      {/* Channels */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {template.default_channels.map((ch) => (
                            <Badge key={ch} variant="outline" className="text-[10px]">{ch}</Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleHire(template)}
                          disabled={isHiring}
                        >
                          {isHiring ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Hiring...
                            </>
                          ) : (
                            "Hire This Agent"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No templates match your search.</p>
        </div>
      )}
    </div>
  );
}
