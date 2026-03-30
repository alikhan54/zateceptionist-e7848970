import { useState, useEffect } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, RefreshCw, CheckCircle2, Clock, AlertCircle, Loader2, Bot } from "lucide-react";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";

type ModuleStatus = "pending" | "training" | "ready" | "error";

interface TrainingModule {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  lastTrained?: string;
}

const INITIAL_MODULES: TrainingModule[] = [
  { id: "sales", name: "Sales AI", description: "Products, pricing, objection handling", status: "pending" },
  { id: "marketing", name: "Marketing AI", description: "Brand voice, content themes, campaigns", status: "pending" },
  { id: "communication", name: "Communication AI", description: "FAQs, booking, business hours", status: "pending" },
  { id: "voice", name: "Voice AI", description: "Phone scripts, call handling", status: "pending" },
  { id: "hr", name: "HR AI", description: "Company culture, roles, policies", status: "pending" },
];

const STATUS_ICON: Record<ModuleStatus, React.ReactNode> = {
  ready: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  training: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  pending: <Clock className="h-5 w-5 text-muted-foreground" />,
};

const STATUS_BADGE: Record<ModuleStatus, React.ReactNode> = {
  ready: <Badge className="bg-green-500 hover:bg-green-600">Ready</Badge>,
  training: <Badge className="bg-blue-500 hover:bg-blue-600">Training...</Badge>,
  error: <Badge variant="destructive">Error</Badge>,
  pending: <Badge variant="secondary">Pending</Badge>,
};

export default function AITraining() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [modules, setModules] = useState<TrainingModule[]>(INITIAL_MODULES);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState<string | null>(null);

  const updateModuleStatus = (id: string, status: ModuleStatus, lastTrained?: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status, ...(lastTrained ? { lastTrained } : {}) } : m))
    );
  };

  const trainModule = async (moduleId: string): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      await callWebhook(
        WEBHOOKS.TRAIN_AI_KNOWLEDGE,
        { tenant_id: tenantId, module: moduleId },
        tenantId
      );
      return true;
    } catch {
      return false;
    }
  };

  const trainAllModules = async () => {
    if (!tenantId) return;
    setIsTraining(true);
    setTrainingProgress(0);

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      setCurrentModule(mod.id);
      updateModuleStatus(mod.id, "training");

      const success = await trainModule(mod.id);
      updateModuleStatus(
        mod.id,
        success ? "ready" : "error",
        success ? new Date().toISOString() : undefined
      );

      setTrainingProgress(((i + 1) / modules.length) * 100);
      // Small delay for visual feedback between modules
      if (i < modules.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    const failCount = modules.filter((m) => m.status === "error").length;
    toast({
      title: failCount > 0 ? "Training Partially Complete" : "Training Complete",
      description: failCount > 0
        ? `${failCount} module(s) failed. Try retraining individually.`
        : "All AI modules trained with your business data",
      variant: failCount > 0 ? "destructive" : undefined,
    });

    setIsTraining(false);
    setCurrentModule(null);
  };

  const trainSingleModule = async (moduleId: string) => {
    if (!tenantId) return;
    setCurrentModule(moduleId);
    updateModuleStatus(moduleId, "training");

    const success = await trainModule(moduleId);
    updateModuleStatus(
      moduleId,
      success ? "ready" : "error",
      success ? new Date().toISOString() : undefined
    );

    const mod = modules.find((m) => m.id === moduleId);
    toast({
      title: success ? "Module Trained" : "Training Failed",
      description: success
        ? `${mod?.name} has been updated`
        : "Failed to train module. Please try again.",
      variant: success ? undefined : "destructive",
    });

    setCurrentModule(null);
  };

  // Agent contexts from Supabase
  interface AgentContext {
    agent_name: string;
    training_version: number;
    last_trained_at: string;
    is_active: boolean;
    confidence_score: number;
  }
  const [agentContexts, setAgentContexts] = useState<AgentContext[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setLoadingAgents(true);
    supabase
      .from("agent_contexts")
      .select("agent_name, training_version, last_trained_at, is_active, confidence_score")
      .eq("tenant_id", tenantId)
      .order("agent_name")
      .then(({ data }) => {
        setAgentContexts(data || []);
        setLoadingAgents(false);
      });
  }, [tenantId]);

  const readyCount = modules.filter((m) => m.status === "ready").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Business Profile</p>
          <h1 className="text-2xl font-bold">AI Training Status</h1>
          <p className="text-muted-foreground">
            Train your AI with your business knowledge and documents
          </p>
        </div>
        <Button onClick={trainAllModules} disabled={isTraining}>
          {isTraining ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Train All Modules
            </>
          )}
        </Button>
      </div>

      {isTraining && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                <div>
                  <p className="font-medium">AI is training...</p>
                  <p className="text-sm text-muted-foreground">
                    Updating your AI with the latest business data. This may take a few seconds.
                  </p>
                </div>
              </div>
              <Progress value={trainingProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(trainingProgress)}% complete
                {currentModule && ` — ${modules.find((m) => m.id === currentModule)?.name}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Training Status
          </CardTitle>
          <CardDescription>
            {readyCount}/{modules.length} modules trained
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(readyCount / modules.length) * 100} className="h-2 mb-6" />

          <div className="space-y-3">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {STATUS_ICON[mod.status]}
                  <div>
                    <p className="font-medium">{mod.name}</p>
                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                    {mod.lastTrained && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last trained: {new Date(mod.lastTrained).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {STATUS_BADGE[mod.status]}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => trainSingleModule(mod.id)}
                    disabled={isTraining || currentModule === mod.id}
                  >
                    {currentModule === mod.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {agentContexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Agent Contexts
            </CardTitle>
            <CardDescription>
              {agentContexts.filter((a) => a.is_active).length}/{agentContexts.length} agents have active contexts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentContexts.map((agent) => (
                <div
                  key={agent.agent_name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {agent.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{agent.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        v{agent.training_version} — Trained{" "}
                        {new Date(agent.last_trained_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(agent.confidence_score * 100)}%
                    </span>
                    <Badge
                      variant={agent.is_active ? "default" : "secondary"}
                      className={agent.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {agent.is_active ? "Active" : "Stale"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">How AI Training Works</h3>
              <p className="text-sm text-muted-foreground mt-1">
                When you train your AI, it learns from your company information,
                knowledge base entries, FAQs, and uploaded documents. The more
                information you provide, the better your AI responds to customers.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Tip:</strong> Add entries to your Knowledge Base before training
                for best results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
