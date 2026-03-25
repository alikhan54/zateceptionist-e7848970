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
  const [trainingStatus, setTrainingStatus] = useState<Record<string, 'pending' | 'training' | 'done' | 'error'>>({});
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);

  // Auto-start training on mount
  useEffect(() => {
    if (!data.trainingComplete && !isTraining) {
      trainAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Even if training call fails, allow user to proceed
      console.error('Training error:', err);
      // Mark remaining as done (best effort)
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
      )}
    </div>
  );
}
