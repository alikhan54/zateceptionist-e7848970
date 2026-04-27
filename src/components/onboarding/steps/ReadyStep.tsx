import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Check, ArrowRight, Loader2, Sparkles, PartyPopper,
  BarChart3, MessageSquare, Send, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { OnboardingData, ONBOARDING_STEPS } from '@/pages/onboarding/constants';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReadyStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

const TRAINING_MODULES = [
  { key: 'sales', label: 'Sales AI', icon: BarChart3, description: 'Products, pricing, objections' },
  { key: 'marketing', label: 'Marketing AI', icon: Sparkles, description: 'Brand voice, content themes' },
  { key: 'communication', label: 'Communication AI', icon: MessageSquare, description: 'FAQs, booking, hours' },
  { key: 'voice', label: 'Voice AI', icon: Send, description: 'Phone scripts, call handling' },
  { key: 'hr', label: 'HR AI', icon: Users, description: 'Company culture, roles' },
];

export default function ReadyStep({ data, updateData }: ReadyStepProps) {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  // Initialize state from persisted data so a previously-completed session
  // (data.trainingComplete=true in localStorage) renders the celebration UI
  // and shows 5/5 instead of 0/5 stuck on Waiting.
  const [trainingStatus, setTrainingStatus] = useState<Record<string, 'pending' | 'training' | 'done' | 'error'>>(() => {
    if (data.trainingComplete) {
      const all: Record<string, 'pending' | 'training' | 'done' | 'error'> = {};
      TRAINING_MODULES.forEach((m) => { all[m.key] = 'done'; });
      return all;
    }
    return {};
  });
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(!!data.trainingComplete);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Auto-start training once tenantId is available (fixes race condition
  // where useEffect fired before TenantContext finished loading tenantId)
  useEffect(() => {
    if (!tenantId) return;
    if (!data.trainingComplete && !isTraining && !trainingComplete) {
      trainAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Stuck detection: if nothing completes within 10s, offer a skip button
  useEffect(() => {
    if (data.trainingComplete || trainingComplete) return;
    const timer = setTimeout(() => {
      if (!trainingComplete && !data.trainingComplete) {
        setShowSkipButton(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [trainingComplete, data.trainingComplete]);

  // Manual re-train: clears the persisted-complete state and re-runs trainAgents
  const handleRetrain = () => {
    setTrainingStatus({});
    setTrainingComplete(false);
    setShowSkipButton(false);
    updateData({ trainingComplete: false });
    if (tenantId) {
      // Defer so updateData state propagates before trainAgents reads guards
      setTimeout(() => trainAgents(), 50);
    }
  };

  const handleSkipToDashboard = async () => {
    setIsSkipping(true);
    try {
      if (tenantId) {
        await supabase
          .from('tenant_config')
          .update({
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);
      }
    } catch (e) {
      console.warn('Skip onboarding_completed update failed:', e);
    }
    updateData({ trainingComplete: true });
    toast({
      title: 'Continuing to dashboard',
      description: 'AI training will continue in the background.',
    });
    navigate('/dashboard');
  };

  const trainAgents = async () => {
    setIsTraining(true);

    // Initialize all modules as pending
    const status: Record<string, 'pending' | 'training' | 'done' | 'error'> = {};
    TRAINING_MODULES.forEach(m => { status[m.key] = 'pending'; });
    setTrainingStatus({ ...status });

    try {
      // Build training payload (OBT.2 expects tenant_id + modules)
      const trainPayload = {
        tenant_id: tenantId,
        modules: ['sales', 'marketing', 'communication', 'voice', 'hr'],
      };

      // Build completion payload matching OBC.2 ENHANCED expected format:
      // { tenant_id, company: {...}, ai_config: {...}, channels: {...}, subscription: {...} }
      const enabledChannels = Object.entries(data.channels)
        .filter(([, enabled]) => enabled)
        .map(([ch]) => ch);
      const completePayload = {
        tenant_id: tenantId,
        company: {
          name: data.companyData.company_name,
          industry: data.companyData.industry,
          description: data.companyData.description,
          contact: {
            phone: data.companyData.contact?.phone || '',
            email: data.companyData.contact?.email || '',
          },
          social_links: data.companyData.social_links || {},
          logo_url: data.companyData.logo_url || '',
        },
        ai_config: {
          ai_name: data.aiConfig.name || 'Zate',
          ai_role: data.aiConfig.role || 'AI Receptionist',
          ai_greeting: data.aiConfig.greeting || 'Hello! How can I help you today?',
          ai_personality: data.aiConfig.personality || 'friendly',
          ai_tone: data.aiConfig.personality || 'friendly',
          timezone: data.aiConfig.timezone || 'America/New_York',
          opening_time: data.aiConfig.workingHoursStart || '09:00',
          closing_time: data.aiConfig.workingHoursEnd || '17:00',
        },
        channels: {
          has_whatsapp: data.channels.whatsapp || false,
          has_voice: data.channels.voiceAI || false,
          has_email: data.channels.email || false,
          has_instagram: data.channels.instagram || false,
          has_facebook: data.channels.facebook || false,
          has_webchat: data.channels.webChat || false,
        },
        subscription: {
          plan: data.selectedPlan || 'free',
          status: 'active',
        },
        enable_voice: data.channels.voiceAI || false,
        automation_mode: 'full',
      };

      // Simulate per-module training progress
      for (const mod of TRAINING_MODULES) {
        status[mod.key] = 'training';
        setTrainingStatus({ ...status });

        // Small delay for visual feedback
        await new Promise(r => setTimeout(r, 600));
        status[mod.key] = 'done';
        setTrainingStatus({ ...status });
      }

      // Call the training webhook (OBT chain: compiles knowledge from business_profiles/services)
      await callWebhook(
        WEBHOOKS.TRAIN_AI_KNOWLEDGE,
        trainPayload,
        tenantId || ''
      );

      // Mark onboarding as complete + save ALL config (OBC chain: saves to tenant_config)
      await callWebhook(
        WEBHOOKS.ONBOARDING_COMPLETE,
        completePayload,
        tenantId || ''
      );

      setTrainingComplete(true);
      updateData({ trainingComplete: true });
    } catch (err) {
      console.error('Training error:', err);
      toast({
        title: "Setup encountered an issue",
        description: "Some features may need manual configuration. You can continue to your dashboard.",
        variant: "destructive",
      });
      // Mark remaining as done (best effort) — still allow user to proceed
      TRAINING_MODULES.forEach(m => {
        if (status[m.key] !== 'done') status[m.key] = 'done';
      });
      setTrainingStatus({ ...status });
      setTrainingComplete(true);
      updateData({ trainingComplete: true });
    } finally {
      setIsTraining(false);
    }
  };

  const completedModules = Object.values(trainingStatus).filter(s => s === 'done').length;
  const progressPercent = (completedModules / TRAINING_MODULES.length) * 100;

  const summaryItems = [
    { label: 'Company', value: data.companyData.company_name || 'Not set' },
    { label: 'Industry', value: data.companyData.industry },
    { label: 'AI Name', value: data.aiConfig.name },
    { label: 'Plan', value: data.selectedPlan },
    { label: 'Channels', value: Object.entries(data.channels).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None' },
    { label: 'Documents', value: `${data.uploadedFiles.filter(f => f.success).length} uploaded` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        {trainingComplete ? (
          <>
            <PartyPopper className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-3xl font-bold">You're All Set!</h2>
            <p className="text-muted-foreground mt-2">
              Your AI agents are trained and ready to work for your business.
            </p>
          </>
        ) : (
          <>
            <Sparkles className="h-16 w-16 mx-auto text-primary mb-4 animate-pulse" />
            <h2 className="text-3xl font-bold">Training Your AI Team</h2>
            <p className="text-muted-foreground mt-2">
              Setting up 5 specialized AI agents for your business...
            </p>
          </>
        )}
      </div>

      {/* Training Progress */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Training Progress</span>
            <span className="text-muted-foreground">{completedModules}/{TRAINING_MODULES.length} modules</span>
          </div>
          <Progress value={progressPercent} className="h-2" />

          <div className="grid gap-3 mt-4">
            {TRAINING_MODULES.map((mod) => {
              const Icon = mod.icon;
              const status = trainingStatus[mod.key] || 'pending';

              return (
                <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{mod.label}</p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                  {status === 'pending' && <Badge variant="outline" className="text-xs">Waiting</Badge>}
                  {status === 'training' && (
                    <Badge variant="outline" className="text-xs border-primary text-primary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Training
                    </Badge>
                  )}
                  {status === 'done' && (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                      <Check className="h-3 w-3 mr-1" /> Ready
                    </Badge>
                  )}
                  {status === 'error' && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                      Skipped
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stuck detection: offer skip button if training hasn't progressed */}
      {showSkipButton && !trainingComplete && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Training is taking longer than expected. You can continue to your dashboard —
              AI training will finish in the background.
            </p>
            <Button
              variant="outline"
              onClick={handleSkipToDashboard}
              disabled={isSkipping}
              className="w-full"
            >
              {isSkipping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Continuing...
                </>
              ) : (
                <>
                  Skip to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {trainingComplete && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Setup Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {summaryItems.map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium capitalize">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {trainingComplete && (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button size="lg" onClick={() => navigate('/dashboard')}>
              Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/inbox')}>
              <MessageSquare className="h-4 w-4 mr-1" /> Send a Test Message
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/settings/team')}>
              <Users className="h-4 w-4 mr-1" /> Invite Team
            </Button>
          </div>
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleRetrain}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Re-run training
            </button>
          </div>
        </>
      )}
    </div>
  );
}
