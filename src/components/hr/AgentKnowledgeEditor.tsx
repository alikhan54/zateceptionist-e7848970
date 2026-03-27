import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Plus, X, Save, Loader2, HelpCircle,
  DollarSign, ShieldCheck, Briefcase
} from "lucide-react";
import type { AIAgent } from "@/hooks/useAIAgents";

interface AgentKnowledgeEditorProps {
  agent: AIAgent;
  onSave: (knowledgeBase: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function AgentKnowledgeEditor({ agent, onSave, isLoading }: AgentKnowledgeEditorProps) {
  const kb = agent.knowledge_base || {};

  const [services, setServices] = useState<string[]>(kb.services || []);
  const [faq, setFaq] = useState<Array<{ q: string; a: string }>>(kb.faq || []);
  const [policies, setPolicies] = useState<string[]>(kb.policies || []);
  const [pricing, setPricing] = useState<string[]>(kb.pricing || []);

  // New item inputs
  const [newService, setNewService] = useState("");
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");
  const [newPolicy, setNewPolicy] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const orig = agent.knowledge_base || {};
    const changed = JSON.stringify({ services, faq, policies, pricing }) !==
      JSON.stringify({ services: orig.services || [], faq: orig.faq || [], policies: orig.policies || [], pricing: orig.pricing || [] });
    setHasChanges(changed);
  }, [services, faq, policies, pricing, agent.knowledge_base]);

  const handleSave = () => {
    onSave({ ...kb, services, faq, policies, pricing });
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Knowledge Base
            {hasChanges && <Badge variant="outline" className="text-[10px] text-amber-600">unsaved</Badge>}
          </span>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isLoading}>
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="services">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="services" className="text-xs gap-1"><Briefcase className="h-3 w-3" /> Services</TabsTrigger>
            <TabsTrigger value="faq" className="text-xs gap-1"><HelpCircle className="h-3 w-3" /> FAQ</TabsTrigger>
            <TabsTrigger value="policies" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> Policies</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Pricing</TabsTrigger>
          </TabsList>

          {/* Services */}
          <TabsContent value="services" className="space-y-2 mt-3">
            {services.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-1">{s}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setServices(services.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add a service..." value={newService} onChange={e => setNewService(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newService.trim()) { setServices([...services, newService.trim()]); setNewService(''); } }}
                className="text-sm h-8" />
              <Button size="sm" variant="outline" className="h-8" disabled={!newService.trim()}
                onClick={() => { setServices([...services, newService.trim()]); setNewService(''); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-3 mt-3">
            {faq.map((item, i) => (
              <div key={i} className="p-2 rounded bg-muted/50 space-y-1">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">Q: {item.q}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">A: {item.a}</p>
              </div>
            ))}
            <div className="space-y-2 border-t pt-2">
              <Input placeholder="Question..." value={newFaqQ} onChange={e => setNewFaqQ(e.target.value)} className="text-sm h-8" />
              <Input placeholder="Answer..." value={newFaqA} onChange={e => setNewFaqA(e.target.value)} className="text-sm h-8" />
              <Button size="sm" variant="outline" disabled={!newFaqQ.trim() || !newFaqA.trim()}
                onClick={() => { setFaq([...faq, { q: newFaqQ.trim(), a: newFaqA.trim() }]); setNewFaqQ(''); setNewFaqA(''); }}>
                <Plus className="h-3 w-3 mr-1" /> Add FAQ
              </Button>
            </div>
          </TabsContent>

          {/* Policies */}
          <TabsContent value="policies" className="space-y-2 mt-3">
            {policies.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-1">{p}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPolicies(policies.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add a policy..." value={newPolicy} onChange={e => setNewPolicy(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newPolicy.trim()) { setPolicies([...policies, newPolicy.trim()]); setNewPolicy(''); } }}
                className="text-sm h-8" />
              <Button size="sm" variant="outline" className="h-8" disabled={!newPolicy.trim()}
                onClick={() => { setPolicies([...policies, newPolicy.trim()]); setNewPolicy(''); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing" className="space-y-2 mt-3">
            {pricing.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-1">{p}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPricing(pricing.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add pricing info..." value={newPrice} onChange={e => setNewPrice(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newPrice.trim()) { setPricing([...pricing, newPrice.trim()]); setNewPrice(''); } }}
                className="text-sm h-8" />
              <Button size="sm" variant="outline" className="h-8" disabled={!newPrice.trim()}
                onClick={() => { setPricing([...pricing, newPrice.trim()]); setNewPrice(''); }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
