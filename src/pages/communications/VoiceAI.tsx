import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Settings2, Play, Mic } from 'lucide-react';

export default function VoiceAI() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice AI</h1>
          <p className="text-muted-foreground mt-1">AI-powered voice communications</p>
        </div>
        <Button><Settings2 className="h-4 w-4 mr-2" />Configure</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Phone className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Calls Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Mic className="h-8 w-8 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">0h</p>
            <p className="text-sm text-muted-foreground">Talk Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Play className="h-8 w-8 mx-auto text-chart-3 mb-2" />
            <p className="text-2xl font-bold">Active</p>
            <p className="text-sm text-muted-foreground">Status</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voice AI Agent</CardTitle>
          <CardDescription>Your AI-powered receptionist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-muted/50 rounded-lg text-center">
            <Phone className="h-16 w-16 mx-auto text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Voice AI is ready</p>
            <p className="text-muted-foreground mb-4">Configure your AI voice agent to handle calls automatically</p>
            <Button>Configure Voice AI</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
