import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mic, Phone, Volume2, Settings2 } from 'lucide-react';

export default function VoiceAISettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voice AI Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your AI voice assistant</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Configuration
          </CardTitle>
          <CardDescription>AI voice settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Voice AI</Label>
              <p className="text-sm text-muted-foreground">Allow AI to handle voice calls</p>
            </div>
            <Switch />
          </div>
          <div className="space-y-2">
            <Label>Voice Type</Label>
            <Input defaultValue="Professional Female" />
          </div>
          <div className="space-y-2">
            <Label>Speaking Rate</Label>
            <Input type="range" min="0.5" max="2" step="0.1" defaultValue="1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Handling
          </CardTitle>
          <CardDescription>Configure how calls are handled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-answer Calls</Label>
              <p className="text-sm text-muted-foreground">Automatically answer incoming calls</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Human Takeover</Label>
              <p className="text-sm text-muted-foreground">Allow transfer to human agent</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Greetings & Scripts
          </CardTitle>
          <CardDescription>Customize AI responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Welcome Greeting</Label>
            <Input defaultValue="Hello, thank you for calling. How can I help you today?" />
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
