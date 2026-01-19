// ============================================================
// STEP 2: ANALYZE - AI Analysis Display
// ============================================================

import React from 'react';
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AIAnalysisResult } from '@/types/onboardingWizard';
import type { StepProps } from './index';

interface AnalyzeStepProps extends StepProps {
  analyzing: boolean;
  result: AIAnalysisResult | null;
  confidence: number;
}

export function AnalyzeStep({
  onNext,
  onPrevious,
  analyzing,
  result,
  confidence,
}: AnalyzeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">AI Analysis in Progress</h2>
        <p className="text-muted-foreground">
          Our AI is extracting information about your business
        </p>
      </div>

      {analyzing ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-primary/10 animate-pulse" />
            <Brain className="h-12 w-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium">Analyzing your business...</p>
            <p className="text-sm text-muted-foreground">This usually takes 15-30 seconds</p>
          </div>
        </div>
      ) : result ? (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Analysis Complete
              </CardTitle>
              <Badge variant="secondary">
                {Math.round(confidence * 100)}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{result.company_name || 'Not detected'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="font-medium">{result.industry || 'Not detected'}</p>
              </div>
            </div>
            {result.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{result.description}</p>
              </div>
            )}
            {result.services && result.services.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Services Detected</p>
                <div className="flex flex-wrap gap-2">
                  {result.services.map((service, i) => (
                    <Badge key={i} variant="outline">{service.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {result.contact && (
              <div className="grid grid-cols-2 gap-4">
                {result.contact.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{result.contact.email}</p>
                  </div>
                )}
                {result.contact.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{result.contact.phone}</p>
                  </div>
                )}
              </div>
            )}
            {result.suggested_ai_config && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Suggested AI Configuration</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{result.suggested_ai_config.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Personality</p>
                    <p className="text-sm font-medium">{result.suggested_ai_config.personality}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No analysis results yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Go back to provide your business information
          </p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={analyzing} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
