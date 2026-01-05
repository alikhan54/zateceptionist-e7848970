import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Webhook, Plus, Check, X } from 'lucide-react';

export default function Integrations() {
  const integrations = [
    { name: 'WhatsApp Business', status: 'connected', icon: '💬' },
    { name: 'Google Calendar', status: 'disconnected', icon: '📅' },
    { name: 'Stripe', status: 'disconnected', icon: '💳' },
    { name: 'Slack', status: 'disconnected', icon: '💼' },
    { name: 'HubSpot', status: 'disconnected', icon: '🔗' },
    { name: 'Zapier', status: 'disconnected', icon: '⚡' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect third-party services</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Integration</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{integration.icon}</span>
                <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                  {integration.status === 'connected' ? (
                    <><Check className="h-3 w-3 mr-1" /> Connected</>
                  ) : (
                    'Not Connected'
                  )}
                </Badge>
              </div>
              <h3 className="font-medium">{integration.name}</h3>
              <Button 
                variant={integration.status === 'connected' ? 'outline' : 'default'} 
                size="sm" 
                className="w-full mt-3"
              >
                {integration.status === 'connected' ? 'Configure' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
