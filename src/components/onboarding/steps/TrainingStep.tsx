// ============================================================
// STEP 8: TRAINING - AI Training
// ============================================================

import React from 'react';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Brain,
  MessageSquare,
  TrendingUp,
  Headphones,
  Users,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { StepProps } from './index';

interface TrainingStepProps extends StepProps {
  training: boolean;
  trainedModules: string[];
  onTrain: () => Promise<void>;
}

const TRAINING_MODULES = [
  { id: 'sales', label: 'Sales Agent', icon: TrendingUp, description: 'Lead qualification & nurturing' },
  { id: 'marketing', label: 'Marketing Agent', icon: MessageSquare, description: 'Campaign responses & engagement' },
  { id: 'communication', label: 'Communication Agent', icon: Headphones, description: 'Customer support & inquiries' },
  { id: 'voice', label: 'Voice Agent', icon: Headphones, description: 'Phone call handling' },
  { id: 'hr', label: 'HR Agent', icon: Users, description: 'Employee & recruitment queries' },
  { id: 'operations', label: 'Operations Agent', icon: Settings, description: 'Internal process assistance' },
];

export function TrainingStep({
  onNext,
  onPrevious,
  training,
  trainedModules,
  onTrain,
}: TrainingStepProps) {
  const trainingComplete = trainedModules.length > 0;
  const progress = training ? 50 : trainingComplete ? 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Train Your AI</h2>
        <p className="text-muted-foreground">
          Final step: Let our AI learn about your business
        </p>
      </div>

      {training ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/10 animate-pulse" />
              <Brain className="h-12 w-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium">Training AI agents...</p>
              <p className="text-sm text-muted-foreground">
                This may take a minute
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Training progress</span>
              <span>Processing...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TRAINING_MODULES.map((module) => (
              <Card key={module.id} className="border-dashed">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                    <module.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{module.label}</p>
                    <p className="text-xs text-muted-foreground">Pending...</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : trainingComplete ? (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Training Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your AI agents have been trained with your business information.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TRAINING_MODULES.map((module) => {
                  const isTrained = trainedModules.includes(module.id);
                  return (
                    <Card key={module.id} className={isTrained ? 'border-primary/30' : 'border-dashed'}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className={`h-8 w-8 rounded flex items-center justify-center ${
                          isTrained ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isTrained ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <module.icon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{module.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {isTrained ? 'Trained' : 'Skipped'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Train</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your AI will learn from your business profile, services, and customer personas
              to provide accurate and helpful responses.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {TRAINING_MODULES.slice(0, 3).map((module) => (
                <div key={module.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <module.icon className="h-4 w-4" />
                  <span>{module.label}</span>
                </div>
              ))}
            </div>
            
            <Button onClick={onTrain} size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" />
              Start Training
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={training} className="gap-2">
          {trainingComplete ? 'Continue' : 'Skip for now'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
