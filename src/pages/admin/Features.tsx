import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, Sparkles, Phone, MessageSquare, Mail, BarChart3 } from 'lucide-react';

export default function FeatureFlags() {
  const features = [
    { id: 'sales_module', label: 'Sales Module', description: 'Enable sales features', icon: BarChart3, enabled: true },
    { id: 'marketing_module', label: 'Marketing Module', description: 'Enable marketing features', icon: Sparkles, enabled: true },
    { id: 'hr_module', label: 'HR Module', description: 'Enable HR features', icon: Layers, enabled: true },
    { id: 'voice_ai', label: 'Voice AI', description: 'Enable voice AI features', icon: Phone, enabled: true },
    { id: 'whatsapp', label: 'WhatsApp Integration', description: 'Enable WhatsApp messaging', icon: MessageSquare, enabled: false },
    { id: 'email_campaigns', label: 'Email Campaigns', description: 'Enable email marketing', icon: Mail, enabled: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground mt-1">Toggle features globally</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Features</CardTitle>
          <CardDescription>Enable or disable features for all tenants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {features.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <Label>{feature.label}</Label>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
              <Switch defaultChecked={feature.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
