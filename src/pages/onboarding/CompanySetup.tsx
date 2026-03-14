import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { DiscoveryStep } from '@/components/onboarding/steps/DiscoveryStep';
import ChannelsStep from '@/components/onboarding/steps/ChannelsStep';
import KnowledgeBaseStep from '@/components/onboarding/steps/KnowledgeBaseStep';
import PaymentStep from '@/components/onboarding/steps/PaymentStep';
import ReadyStep from '@/components/onboarding/steps/ReadyStep';
import {
  OnboardingData, DEFAULT_ONBOARDING_DATA, ONBOARDING_STEPS,
} from '@/pages/onboarding/constants';

const STEP_COMPONENTS = [
  DiscoveryStep,
  ChannelsStep,
  KnowledgeBaseStep,
  PaymentStep,
  ReadyStep,
];

const SESSION_KEY = '420_onboarding_progress';

export default function CompanySetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId } = useTenant();
  const { toast } = useToast();

  // Load saved state from localStorage for resume capability
  const [data, setData] = useState<OnboardingData>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingData;
        return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_ONBOARDING_DATA;
  });

  const [skippedSteps, setSkippedSteps] = useState<string[]>(data.skippedSteps || []);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const currentStep = data.currentStep;

  // Handle payment return URL params
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      updateData({ paymentVerified: true, trialStarted: true, currentStep: 4 });
      toast({ title: 'Payment verified', description: 'Your trial has started!' });
    } else if (paymentStatus === 'canceled') {
      toast({ title: 'Payment cancelled', description: 'You can try again or continue with Free plan.', variant: 'destructive' });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [data]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToStep = (step: number) => {
    updateData({ currentStep: step });
  };

  const handleNext = () => {
    const nextStep = currentStep + 1;
    setCompletedSteps((prev) => [...new Set([...prev, String(currentStep)])]);
    if (nextStep < ONBOARDING_STEPS.length) {
      goToStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    const stepId = ONBOARDING_STEPS[currentStep]?.id;
    if (stepId) {
      setSkippedSteps((prev) => [...new Set([...prev, stepId])]);
      updateData({ skippedSteps: [...new Set([...skippedSteps, stepId])] });
    }
    handleNext();
  };

  // Determine which step component to render
  const StepComponent = STEP_COMPONENTS[currentStep];

  // Wrap PaymentStep in Stripe Elements
  const renderStep = () => {
    if (!StepComponent) return null;

    const stepProps = {
      data,
      updateData,
      onNext: handleNext,
      onBack: handleBack,
      onSkip: handleSkip,
    };

    // ReadyStep has no onNext/onBack/onSkip
    if (currentStep === 4) {
      return <ReadyStep data={data} updateData={updateData} />;
    }

    // PaymentStep needs Stripe Elements wrapper
    if (currentStep === 3) {
      if (stripePromise) {
        return (
          <Elements stripe={stripePromise}>
            <PaymentStep {...stepProps} />
          </Elements>
        );
      }
      // Stripe not configured — still render, it handles the fallback UI
      return <PaymentStep {...stepProps} />;
    }

    return <StepComponent {...stepProps} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Setup Your Business</h1>
              <p className="text-sm text-muted-foreground">
                {ONBOARDING_STEPS[currentStep]?.description}
              </p>
            </div>
            {currentStep < 4 && (
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </span>
            )}
          </div>
          <OnboardingProgress
            currentStep={currentStep}
            skippedSteps={skippedSteps}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
