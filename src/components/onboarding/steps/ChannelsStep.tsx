import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, MessageSquare, Phone, Mail, Instagram, Facebook,
  Globe, ArrowRight, SkipForward, ChevronLeft, Check, Sparkles,
} from 'lucide-react';
import { OAuthConnectButton } from '@/components/onboarding/OAuthConnectButton';
import {
  AI_PERSONALITIES, AI_NAME_SUGGESTIONS, TIMEZONES, AI_ROLES,
  OnboardingData, AIConfig, ChannelConfig,
} from '@/pages/onboarding/constants';

interface ChannelsStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const CHANNELS = [
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500', description: 'Business messaging via WATI' },
  { key: 'instagram' as const, label: 'Instagram', icon: Instagram, color: 'text-pink-500', description: 'DM automation via Meta', oauth: 'facebook' as const },
  { key: 'facebook' as const, label: 'Facebook', icon: Facebook, color: 'text-blue-600', description: 'Messenger automation via Meta', oauth: 'facebook' as const },
  { key: 'email' as const, label: 'Email', icon: Mail, color: 'text-amber-500', description: 'SMTP-based email automation' },
  { key: 'voiceAI' as const, label: 'Voice AI', icon: Phone, color: 'text-purple-500', description: 'AI phone calls via VAPI' },
  { key: 'webChat' as const, label: 'Website Chat', icon: Globe, color: 'text-cyan-500', description: 'Embedded chat widget' },
];

export default function ChannelsStep({ data, updateData, onNext, onBack, onSkip }: ChannelsStepProps) {
  const [section, setSection] = useState<'ai' | 'channels'>('ai');
  const { aiConfig, channels, connectedChannels, companyData } = data;

  const industrySuggestions = AI_NAME_SUGGESTIONS[companyData.industry] || AI_NAME_SUGGESTIONS.general;

  const updateAI = (updates: Partial<AIConfig>) => {
    updateData({ aiConfig: { ...aiConfig, ...updates } });
  };

  const updateChannels = (updates: Partial<ChannelConfig>) => {
    updateData({ channels: { ...channels, ...updates } });
  };

  const handleOAuthSuccess = (provider: string) => {
    const updated = [...connectedChannels];
    if (!updated.includes(provider)) updated.push(provider);
    updateData({ connectedChannels: updated });
  };

  const isChannelConnected = (key: string) => connectedChannels.includes(key);

  if (section === 'ai') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Configure Your AI Assistant</h2>
          <p className="text-muted-foreground mt-1">Personalize how your AI interacts with customers</p>
        </div>

        {/* AI Name */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>AI Assistant Name</Label>
              <Input
                value={aiConfig.name}
                onChange={(e) => updateAI({ name: e.target.value })}
                placeholder="e.g., Luna, Max, Zate"
              />
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Suggestions:</span>
                {industrySuggestions.map((name) => (
                  <Badge
                    key={name}
                    variant={aiConfig.name === name ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => updateAI({ name })}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>AI Role</Label>
              <Select value={aiConfig.role} onValueChange={(v) => updateAI({ role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personality */}
            <div className="space-y-2">
              <Label>Personality</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {AI_PERSONALITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => updateAI({ personality: p.value })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      aiConfig.personality === p.value
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <p className="text-sm font-medium mt-1">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Greeting */}
            <div className="space-y-2">
              <Label>First Message / Greeting</Label>
              <Textarea
                value={aiConfig.greeting}
                onChange={(e) => updateAI({ greeting: e.target.value })}
                placeholder="Hello! I'm your AI assistant..."
                rows={3}
              />
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Working Hours Start</Label>
                <Input
                  type="time"
                  value={aiConfig.workingHoursStart}
                  onChange={(e) => updateAI({ workingHoursStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Working Hours End</Label>
                <Input
                  type="time"
                  value={aiConfig.workingHoursEnd}
                  onChange={(e) => updateAI({ workingHoursEnd: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={aiConfig.timezone} onValueChange={(v) => updateAI({ timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Preview */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{aiConfig.name || 'AI Assistant'} <span className="text-muted-foreground text-sm">({aiConfig.role})</span></p>
                <p className="text-sm text-muted-foreground mt-1 italic">"{aiConfig.greeting}"</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {AI_PERSONALITIES.find(p => p.value === aiConfig.personality)?.label || 'Friendly'} personality
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={() => setSection('channels')}>
            Next: Connect Channels <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Channels Section
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Connect Your Channels</h2>
        <p className="text-muted-foreground mt-1">Enable the platforms where your AI will engage customers</p>
      </div>

      <div className="grid gap-4">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const connected = isChannelConnected(ch.key);
          const enabled = channels[ch.key];

          return (
            <Card key={ch.key} className={`transition-all ${enabled ? 'border-primary/50' : ''}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted ${ch.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {ch.label}
                        {connected && (
                          <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                            <Check className="h-3 w-3 mr-1" /> Connected
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{ch.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {ch.oauth && !connected && enabled && (
                      <OAuthConnectButton
                        provider={ch.oauth}
                        size="sm"
                        label={`Connect ${ch.label}`}
                        connected={connected}
                        onSuccess={() => handleOAuthSuccess(ch.key)}
                      />
                    )}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => updateChannels({ [ch.key]: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        You can connect and configure channels in detail from Settings after onboarding.
      </p>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={() => setSection('ai')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> AI Config
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" /> Skip
          </Button>
          <Button onClick={onNext}>
            Continue <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
