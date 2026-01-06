import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Users,
  MessageSquare,
  TrendingUp,
  Megaphone,
  Phone,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
} from 'lucide-react';

const ONBOARDING_KEY = 'onboarding-completed';
const CHECKLIST_KEY = 'onboarding-checklist';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Business Hub',
    description: 'Everything you need to manage customers, sales, and marketing in one place.',
    icon: <Sparkles className="h-12 w-12" />,
    features: [
      'AI-powered automation',
      'Multi-channel communications',
      'Advanced analytics',
      'Team collaboration',
    ],
  },
  {
    id: 'crm',
    title: 'Customer Relationship Management',
    description: 'Manage all your customer interactions and data in one unified inbox.',
    icon: <Users className="h-12 w-12" />,
    features: [
      'Unified customer profiles',
      'Conversation history',
      'Task management',
      'Appointment scheduling',
    ],
  },
  {
    id: 'sales',
    title: 'Sales Automation',
    description: 'Generate leads automatically and track deals through your pipeline.',
    icon: <TrendingUp className="h-12 w-12" />,
    features: [
      'AI lead generation',
      'Visual pipeline',
      'Email sequences',
      'Deal tracking',
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing Engine',
    description: 'Create compelling content and run multi-channel campaigns.',
    icon: <Megaphone className="h-12 w-12" />,
    features: [
      'AI content generation',
      'Campaign automation',
      'Social media management',
      'Email builder',
    ],
  },
  {
    id: 'communications',
    title: 'AI Communications',
    description: 'Let AI handle calls, messages, and customer support 24/7.',
    icon: <Phone className="h-12 w-12" />,
    features: [
      'Voice AI agents',
      'WhatsApp integration',
      'SMS automation',
      'Call center',
    ],
  },
];

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  url: string;
}

const initialChecklist: ChecklistItem[] = [
  { id: 'profile', title: 'Complete your profile', description: 'Add company details', completed: false, url: '/settings' },
  { id: 'customer', title: 'Add your first customer', description: 'Import or create a customer', completed: false, url: '/customers' },
  { id: 'integration', title: 'Connect an integration', description: 'Link email, calendar, etc.', completed: false, url: '/settings/integrations' },
  { id: 'campaign', title: 'Create a campaign', description: 'Launch your first marketing campaign', completed: false, url: '/marketing/campaigns' },
  { id: 'team', title: 'Invite team members', description: 'Collaborate with your team', completed: false, url: '/settings/team' },
];

export function OnboardingFlow() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [showChecklist, setShowChecklist] = useState(false);

  // Check if first time user
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setShowTutorial(true);
    }

    // Load checklist progress
    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    if (savedChecklist) {
      try {
        setChecklist(JSON.parse(savedChecklist));
      } catch {
        setChecklist(initialChecklist);
      }
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowTutorial(false);
    setShowChecklist(true);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowTutorial(false);
  };

  const toggleChecklistItem = (id: string) => {
    const updated = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated));
  };

  const completedCount = checklist.filter(i => i.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  const step = steps[currentStep];

  return (
    <>
      {/* Onboarding Tutorial Modal */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
          {/* Progress indicator */}
          <div className="flex gap-1 p-4 pb-0">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          <DialogHeader className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {step.icon}
            </div>
            <DialogTitle className="text-2xl">{step.title}</DialogTitle>
            <DialogDescription className="text-base">
              {step.description}
            </DialogDescription>
          </DialogHeader>

          {/* Features */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {step.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip tutorial
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleComplete}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Checklist */}
      {showChecklist && completedCount < checklist.length && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-80 shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h4 className="font-semibold text-sm">Setup Progress</h4>
                <p className="text-xs text-muted-foreground">
                  {completedCount} of {checklist.length} completed
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowChecklist(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Progress value={progress} className="h-1" />

            <div className="p-2 max-h-60 overflow-auto">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors hover:bg-muted/50",
                    item.completed && "opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      item.completed
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {item.completed && <CheckCircle className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", item.completed && "line-through")}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
