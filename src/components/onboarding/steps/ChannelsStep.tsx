// ============================================================
// STEP 7: CHANNELS - Communication Channels
// ============================================================

import React from 'react';
import {
  MessageCircle,
  Mail,
  MessageSquare,
  Phone,
  Instagram,
  Facebook,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { StepProps } from './index';

interface ChannelConfig {
  whatsapp: boolean;
  email: boolean;
  sms: boolean;
  voice: boolean;
  instagram: boolean;
  facebook: boolean;
}

interface ChannelsStepProps extends StepProps {
  channels: ChannelConfig;
  setChannels: React.Dispatch<React.SetStateAction<ChannelConfig>>;
}

const CHANNEL_LIST = [
  {
    key: 'whatsapp' as const,
    label: 'WhatsApp',
    icon: MessageCircle,
    description: 'Handle WhatsApp Business messages',
    popular: true,
    color: 'text-green-600',
  },
  {
    key: 'email' as const,
    label: 'Email',
    icon: Mail,
    description: 'Respond to email inquiries',
    popular: true,
    color: 'text-blue-600',
  },
  {
    key: 'sms' as const,
    label: 'SMS',
    icon: MessageSquare,
    description: 'Text message support',
    popular: false,
    color: 'text-purple-600',
  },
  {
    key: 'voice' as const,
    label: 'Voice/Phone',
    icon: Phone,
    description: 'AI-powered phone support',
    popular: false,
    color: 'text-orange-600',
    beta: true,
  },
  {
    key: 'instagram' as const,
    label: 'Instagram DMs',
    icon: Instagram,
    description: 'Handle Instagram direct messages',
    popular: true,
    color: 'text-pink-600',
  },
  {
    key: 'facebook' as const,
    label: 'Facebook Messenger',
    icon: Facebook,
    description: 'Respond to Facebook messages',
    popular: false,
    color: 'text-blue-700',
  },
];

export function ChannelsStep({
  onNext,
  onPrevious,
  channels,
  setChannels,
}: ChannelsStepProps) {
  const enabledCount = Object.values(channels).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Communication Channels</h2>
        <p className="text-muted-foreground">
          Choose which channels your AI should handle
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary">
          {enabledCount} channel{enabledCount !== 1 ? 's' : ''} enabled
        </Badge>
        <span className="text-sm text-muted-foreground">
          You can always add more later
        </span>
      </div>

      <div className="grid gap-3">
        {CHANNEL_LIST.map((channel) => (
          <Card
            key={channel.key}
            className={`transition-all ${
              channels[channel.key]
                ? 'border-primary/50 bg-primary/5'
                : 'hover:border-border/80'
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${channel.color}`}>
                  <channel.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{channel.label}</p>
                    {channel.popular && (
                      <Badge variant="outline" className="text-xs">Popular</Badge>
                    )}
                    {channel.beta && (
                      <Badge variant="secondary" className="text-xs">Beta</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                </div>
              </div>
              <Switch
                checked={channels[channel.key]}
                onCheckedChange={(checked) =>
                  setChannels((prev) => ({ ...prev, [channel.key]: checked }))
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info note */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            After setup, you'll be able to connect each channel with your accounts.
            <Button variant="link" className="h-auto p-0 ml-1 text-sm">
              Learn more <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </p>
        </CardContent>
      </Card>

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
