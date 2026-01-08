import { useState } from 'react';
import { useIntegrations, Integration } from '@/hooks/useIntegrations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Check, X, Settings, Loader2,
  MessageSquare, Calendar, CreditCard,
  Zap, Instagram, Facebook, Mail, Mic, Brain, Bug,
  AlertCircle, CheckCircle, Webhook
} from 'lucide-react';

const INTEGRATION_FIELDS: Record<string, { label: string; placeholder: string; type?: string }[]> = {
  whatsapp: [
    { label: 'WATI API Key', placeholder: 'Enter your WATI API key' },
    { label: 'WATI Endpoint', placeholder: 'live-server-XXXX.wati.io' },
  ],
  google_calendar: [
    { label: 'Calendar ID', placeholder: 'your-calendar@group.calendar.google.com' },
  ],
  stripe: [
    { label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' },
    { label: 'Publishable Key', placeholder: 'pk_live_...' },
  ],
  slack: [
    { label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
  ],
  hubspot: [
    { label: 'API Key', placeholder: 'Enter your HubSpot API key', type: 'password' },
  ],
  zapier: [
    { label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/...' },
  ],
  instagram: [
    { label: 'Page ID', placeholder: 'Your Instagram business page ID' },
    { label: 'Access Token', placeholder: 'Your Meta access token', type: 'password' },
  ],
  facebook: [
    { label: 'Page ID', placeholder: 'Your Facebook page ID' },
    { label: 'Page Token', placeholder: 'Your page access token', type: 'password' },
  ],
  vapi: [
    { label: 'API Key', placeholder: 'Your VAPI API key', type: 'password' },
    { label: 'Assistant ID', placeholder: 'Your assistant ID' },
  ],
  openai: [
    { label: 'API Key', placeholder: 'sk-...', type: 'password' },
  ],
  apify: [
    { label: 'API Token', placeholder: 'Your Apify API token', type: 'password' },
  ],
};

const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-5 w-5" />,
  google_calendar: <Calendar className="h-5 w-5" />,
  stripe: <CreditCard className="h-5 w-5" />,
  slack: <Webhook className="h-5 w-5" />,
  hubspot: <Webhook className="h-5 w-5" />,
  zapier: <Zap className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  vapi: <Mic className="h-5 w-5" />,
  openai: <Brain className="h-5 w-5" />,
  apify: <Bug className="h-5 w-5" />,
};

export default function Integrations() {
  const { integrations, isLoading, connectIntegration, disconnectIntegration } = useIntegrations();
  const { toast } = useToast();
  
  const [configuring, setConfiguring] = useState<Integration | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleConfigure = (integration: Integration) => {
    setConfiguring(integration);
    setConfigValues(integration.config as Record<string, string> || {});
  };

  const handleSave = async () => {
    if (!configuring) return;
    
    setIsSaving(true);
    try {
      await connectIntegration.mutateAsync({
        type: configuring.integration_type,
        config: configValues,
      });
      toast({ title: 'Integration connected successfully!' });
      setConfiguring(null);
      setConfigValues({});
    } catch (error) {
      toast({ title: 'Failed to connect integration', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (type: string) => {
    try {
      await disconnectIntegration.mutateAsync(type);
      toast({ title: 'Integration disconnected' });
    } catch (error) {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const getFieldKey = (type: string, index: number): string => {
    const keyMappings: Record<string, string[]> = {
      whatsapp: ['wati_api_key', 'wati_endpoint'],
      google_calendar: ['google_calendar_id'],
      stripe: ['stripe_secret_key', 'stripe_publishable_key'],
      slack: ['slack_webhook_url'],
      hubspot: ['hubspot_api_key'],
      zapier: ['zapier_webhook_url'],
      instagram: ['instagram_page_id', 'instagram_access_token'],
      facebook: ['meta_page_id', 'meta_page_token'],
      vapi: ['vapi_api_key', 'vapi_assistant_id'],
      openai: ['openai_api_key'],
      apify: ['apify_api_key'],
    };
    return keyMappings[type]?.[index] || `field_${index}`;
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect third-party services to automate your business
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {connectedCount} of {integrations.length} connected
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <Card key={integration.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {INTEGRATION_ICONS[integration.integration_type] || <Webhook className="h-5 w-5" />}
                  </div>
                  <Badge 
                    variant={integration.status === 'connected' ? 'default' : integration.status === 'error' ? 'destructive' : 'secondary'}
                  >
                    {integration.status === 'connected' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                    ) : integration.status === 'error' ? (
                      <><AlertCircle className="h-3 w-3 mr-1" /> Error</>
                    ) : (
                      'Not Connected'
                    )}
                  </Badge>
                </div>
                
                <h3 className="font-medium">{integration.integration_name}</h3>
                
                {integration.error_message && (
                  <p className="text-xs text-destructive mt-1">{integration.error_message}</p>
                )}
                
                {integration.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last synced: {new Date(integration.last_sync_at).toLocaleDateString()}
                  </p>
                )}
                
                <div className="flex gap-2 mt-3">
                  {integration.status === 'connected' ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleConfigure(integration)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Configure
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDisconnect(integration.integration_type)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleConfigure(integration)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={!!configuring} onOpenChange={(open) => !open && setConfiguring(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configuring && INTEGRATION_ICONS[configuring.integration_type]}
              Configure {configuring?.integration_name}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect this integration.
            </DialogDescription>
          </DialogHeader>
          
          {configuring && (
            <div className="space-y-4 pt-4">
              {INTEGRATION_FIELDS[configuring.integration_type]?.map((field, idx) => {
                const fieldKey = getFieldKey(configuring.integration_type, idx);
                return (
                  <div key={idx} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={configValues[fieldKey] || ''}
                      onChange={(e) => setConfigValues(prev => ({
                        ...prev,
                        [fieldKey]: e.target.value,
                      }))}
                    />
                  </div>
                );
              })}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setConfiguring(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save & Connect
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
