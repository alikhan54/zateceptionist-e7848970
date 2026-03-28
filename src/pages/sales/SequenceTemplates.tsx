import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Layers, ChevronDown, Mail, Phone, MessageSquare, Loader2 } from "lucide-react";
import { FeatureBanner } from "@/components/FeatureBanner";

interface SeqTemplate {
  id: string; name: string; description?: string; trigger_sentiment?: string;
  steps: any[]; total_steps: number; total_days: number; channels_used: string[];
  is_default: boolean; is_active: boolean;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-500/20 text-green-400", booking: "bg-blue-500/20 text-blue-400",
  question: "bg-purple-500/20 text-purple-400", negative: "bg-red-500/20 text-red-400",
};
const CHANNEL_ICONS: Record<string, any> = { email: Mail, call: Phone, whatsapp: MessageSquare };

export default function SequenceTemplates() {
  const { tenantId } = useTenant();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["sequence_templates", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("sequence_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((t: any) => t.trigger_sentiment) as SeqTemplate[];
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold flex items-center gap-2"><Layers className="h-8 w-8" /> Sequence Templates</h1>
      <p className="text-muted-foreground mt-1">Pre-built follow-up sequences triggered by reply sentiment</p></div>

      <FeatureBanner icon={Layers} title="Smart Reply Templates" description="Pre-built follow-up sequences triggered by reply sentiment." />

      <div className="grid gap-4">
        {templates.map(t => {
          const steps = Array.isArray(t.steps) ? t.steps : [];
          return (
            <Card key={t.id}>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    {t.trigger_sentiment && <Badge className={SENTIMENT_COLORS[t.trigger_sentiment] || "bg-gray-500/20"}>{t.trigger_sentiment}</Badge>}
                    {t.is_default && <Badge variant="outline" className="text-xs">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{t.total_steps} steps</span>
                    <span>{t.total_days} days</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              </CardHeader>
              {expanded === t.id && (
                <CardContent className="border-t pt-4">
                  <div className="space-y-4">
                    {steps.map((step: any, i: number) => {
                      const Icon = CHANNEL_ICONS[step.channel] || Mail;
                      return (
                        <div key={i} className="flex gap-4 p-3 bg-muted/30 rounded-lg">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">{i + 1}</div>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Day {step.day}</span>
                          </div>
                          <div className="flex-1">
                            {step.subject && <div className="font-medium text-sm mb-1">{step.subject}</div>}
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{step.body}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {templates.length === 0 && <Card><CardContent className="pt-8 pb-8 text-center text-muted-foreground">No sequence templates yet.</CardContent></Card>}
      </div>
    </div>
  );
}
