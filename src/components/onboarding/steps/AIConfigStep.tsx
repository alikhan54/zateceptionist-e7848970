// ============================================================
// STEP 6: AI CONFIG - AI Agent Configuration
// ============================================================

import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { StepProps } from './index';

const AI_PERSONALITIES = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused', emoji: '💼' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable', emoji: '😊' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational', emoji: '👋' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive', emoji: '💙' },
];

interface AIConfigStepProps extends StepProps {
  aiName: string;
  setAiName: (name: string) => void;
  aiRole: string;
  setAiRole: (role: string) => void;
  aiPersonality: string;
  setAiPersonality: (personality: string) => void;
  aiGreeting: string;
  setAiGreeting: (greeting: string) => void;
}

export function AIConfigStep({
  onNext,
  onPrevious,
  aiName,
  setAiName,
  aiRole,
  setAiRole,
  aiPersonality,
  setAiPersonality,
  aiGreeting,
  setAiGreeting,
}: AIConfigStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Configure Your AI Assistant</h2>
        <p className="text-muted-foreground">
          Customize how your AI represents your business
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="aiName">AI Name</Label>
            <Input
              id="aiName"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="e.g., Zate, Alex, Luna"
            />
            <p className="text-xs text-muted-foreground">
              The name customers will see when chatting
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiRole">AI Role</Label>
            <Input
              id="aiRole"
              value={aiRole}
              onChange={(e) => setAiRole(e.target.value)}
              placeholder="e.g., Customer Support, Sales Assistant"
            />
            <p className="text-xs text-muted-foreground">
              How the AI introduces itself
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>AI Personality</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose the communication style for your AI
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AI_PERSONALITIES.map((p) => (
              <Card
                key={p.value}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  aiPersonality === p.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setAiPersonality(p.value)}
              >
                <CardContent className="p-4 text-center">
                  <span className="text-2xl mb-2 block">{p.emoji}</span>
                  <p className="font-medium text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aiGreeting">Custom Greeting (Optional)</Label>
          <Textarea
            id="aiGreeting"
            value={aiGreeting}
            onChange={(e) => setAiGreeting(e.target.value)}
            placeholder={`Hi! I'm ${aiName || '[AI Name]'}, your ${aiRole || '[Role]'}. How can I help you today?`}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            The first message customers receive. Leave blank for auto-generated greeting.
          </p>
        </div>

        {/* Preview */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {aiName.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{aiName || 'AI Assistant'}</p>
                <p className="text-sm text-muted-foreground">
                  {aiGreeting || `Hi! I'm ${aiName || 'your AI assistant'}, your ${aiRole || 'helper'}. How can I help you today?`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
