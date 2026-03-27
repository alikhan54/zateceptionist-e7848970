import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Bot, ArrowLeft, Phone, TrendingUp, Headphones, UserSearch,
  Megaphone, CalendarCheck, Banknote, Building, ClipboardList,
  UtensilsCrossed, Search, Loader2, Sparkles, LayoutGrid
} from "lucide-react";
import { useAgentTemplates, AIAgentTemplate } from "@/hooks/useAIAgents";
import { callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
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

const examplePrompts = [
  "A bilingual receptionist who speaks Arabic and English, answers calls, and books salon appointments",
  "A sales rep who qualifies inbound leads via WhatsApp and books demo meetings",
  "A support agent for WhatsApp customer service who handles complaints with empathy",
  "A recruiter who screens resumes, schedules interviews, and follows up with candidates",
];

export default function AIAgentHire() {
  const navigate = useNavigate();
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || "";
  const { data: templates = [], isLoading } = useAgentTemplates();
  const [search, setSearch] = useState("");
  const [hiringId, setHiringId] = useState<string | null>(null);

  // Custom description state
  const [description, setDescription] = useState("");
  const [agentName, setAgentName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const filtered = templates.filter(t =>
    !search ||
    t.template_name.toLowerCase().includes(search.toLowerCase()) ||
    t.template_role.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleHireTemplate = async (template: AIAgentTemplate) => {
    setHiringId(template.id);
    try {
      const result = await callWebhook("/hr/ai-agent/create", {
        template_id: template.id,
        template_defaults: {
          template_name: template.template_name,
          template_role: template.template_role,
          default_personality: template.default_personality,
          default_capabilities: template.default_capabilities,
          default_channels: template.default_channels,
          default_tools: template.default_tools,
          default_system_prompt: template.default_system_prompt,
          default_knowledge_base: template.default_knowledge_base,
          default_escalation_rules: template.default_escalation_rules,
        },
        agent_name: agentName || undefined,
      }, tenantUuid);

      const data = result.data as any;
      if (data?.success && data.agent?.id) {
        toast.success(`${data.agent.agent_name} hired successfully!`);
        navigate(`/hr/ai-agents/${data.agent.id}`);
      } else if (result.success !== false) {
        // callWebhook wraps the response — check top-level
        const agentId = (result as any).agent?.id || data?.agent?.id;
        if (agentId) {
          toast.success("Agent hired!");
          navigate(`/hr/ai-agents/${agentId}`);
          return;
        }
        toast.error(data?.message || "Failed to hire agent");
      } else {
        toast.error(result.error || "Failed to hire agent");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to hire agent");
    } finally {
      setHiringId(null);
    }
  };

  const handleHireCustom = async () => {
    if (!description.trim()) {
      toast.error("Please describe the agent you want to hire");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await callWebhook("/hr/ai-agent/create", {
        description: description.trim(),
        agent_name: agentName.trim() || undefined,
      }, tenantUuid);

      const data = result.data as any;
      const agent = data?.agent || (result as any).agent;
      if (agent?.id) {
        toast.success(`${agent.agent_name} hired successfully!`);
        navigate(`/hr/ai-agents/${agent.id}`);
      } else {
        toast.error(data?.message || result.error || "Failed to generate agent");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate agent");
    } finally {
      setIsGenerating(false);
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
          <p className="text-muted-foreground">Choose a template or describe what you need — AI builds the rest.</p>
        </div>
      </div>

      <Tabs defaultValue="describe" className="space-y-6">
        <TabsList>
          <TabsTrigger value="describe" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Describe Your Agent
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Choose Template
          </TabsTrigger>
        </TabsList>

        {/* ---- TAB: Describe Your Agent ---- */}
        <TabsContent value="describe" className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-base font-semibold">What kind of AI employee do you need?</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe the role, skills, languages, channels, and behavior. The more detail, the better.
                </p>
              </div>

              <Textarea
                placeholder="Example: I need a bilingual receptionist who speaks Arabic and English, answers phone calls for my salon, books appointments, knows our price list, and sends WhatsApp reminders to no-shows."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />

              {/* Example chips */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      {prompt.slice(0, 60)}...
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <Label>Agent name (optional)</Label>
                <Input
                  placeholder="e.g. Layla, Sara, Omar..."
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button
                size="lg"
                onClick={handleHireCustom}
                disabled={isGenerating || !description.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is generating your agent...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Hire with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TAB: Choose Template ---- */}
        <TabsContent value="templates" className="space-y-4">
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

                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {template.default_channels.map((ch) => (
                                <Badge key={ch} variant="outline" className="text-[10px]">{ch}</Badge>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleHireTemplate(template)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
