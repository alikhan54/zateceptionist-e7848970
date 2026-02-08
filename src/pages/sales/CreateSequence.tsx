// src/pages/sales/CreateSequence.tsx
// Create new sales sequence page

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Zap, Plus, Mail, Phone, MessageSquare, Linkedin, Clock, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SequenceStep {
  type: "email" | "whatsapp" | "call" | "linkedin";
  delay_days: number;
  delay_hours: number;
  template: string;
  subject?: string;
}

const channelConfig = {
  email: { label: "Email", icon: Mail, color: "bg-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-green-500" },
  call: { label: "Call", icon: Phone, color: "bg-amber-500" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
};

export default function CreateSequence() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [saving, setSaving] = useState(false);

  const addStep = (type: SequenceStep["type"]) => {
    setSteps([
      ...steps,
      {
        type,
        delay_days: steps.length === 0 ? 0 : 1,
        delay_hours: 0,
        template: "",
        subject: type === "email" ? "" : undefined,
      },
    ]);
  };

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Please enter a sequence name", variant: "destructive" });
      return;
    }

    if (!tenantId) {
      toast({ title: "Tenant not loaded", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("sequences")
        .insert({
          tenant_id: tenantId, // SLUG — sequences uses TEXT tenant_id
          name: name.trim(),
          description: description.trim() || null,
          status: "draft",
          steps: steps,
          enrolled_count: 0,
          completed_count: 0,
          open_rate: 0,
          reply_rate: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Sequence created successfully!" });
      navigate(`/sales/sequences`);
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast({
        title: "Failed to create sequence",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sales/sequences")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Create New Sequence
          </h1>
          <p className="text-muted-foreground">Build an automated multi-channel outreach workflow</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Details</CardTitle>
          <CardDescription>Give your sequence a name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sequence Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cold Outreach - SaaS Founders"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and target audience for this sequence..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Steps</CardTitle>
          <CardDescription>Add touchpoints to your outreach sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Steps */}
          {steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No steps yet. Add your first touchpoint below.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => {
                const config = channelConfig[step.type];
                const Icon = config.icon;

                return (
                  <Card key={index} className="border-l-4" style={{ borderLeftColor: config.color.replace("bg-", "") }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full ${config.color} flex items-center justify-center`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <Badge variant="secondary">Step {index + 1}</Badge>
                            <span className="ml-2 font-medium">{config.label}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Wait (Days)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={step.delay_days}
                            onChange={(e) => updateStep(index, { delay_days: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Wait (Hours)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={step.delay_hours}
                            onChange={(e) => updateStep(index, { delay_hours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {step.type === "email" && (
                        <div className="space-y-2 mb-4">
                          <Label>Subject Line</Label>
                          <Input
                            value={step.subject || ""}
                            onChange={(e) => updateStep(index, { subject: e.target.value })}
                            placeholder="Email subject..."
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Message Template</Label>
                        <Textarea
                          value={step.template}
                          onChange={(e) => updateStep(index, { template: e.target.value })}
                          placeholder={`Write your ${config.label.toLowerCase()} message...`}
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use variables: {`{{first_name}}`}, {`{{company}}`}, {`{{title}}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add Step Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <span className="text-sm text-muted-foreground mr-2 self-center">Add step:</span>
            {(Object.keys(channelConfig) as Array<keyof typeof channelConfig>).map((type) => {
              const config = channelConfig[type];
              const Icon = config.icon;
              return (
                <Button key={type} variant="outline" size="sm" onClick={() => addStep(type)}>
                  <Icon className="h-4 w-4 mr-1" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/sales/sequences")}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreate} disabled={saving || !name.trim()}>
            Save as Draft
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create Sequence"}
          </Button>
        </div>
      </div>
    </div>
  );
}
