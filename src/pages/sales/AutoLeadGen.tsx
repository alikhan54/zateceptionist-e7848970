import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Play, Settings2 } from 'lucide-react';

export default function AutoLeadGen() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Auto Lead Gen
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered lead generation</p>
        </div>
        <Button><Play className="h-4 w-4 mr-2" />Start Campaign</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>B2B Lead Generation</CardTitle>
            <CardDescription>Find and enrich business leads automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground">Configure your ideal customer profile</p>
            </div>
            <Button variant="outline" className="w-full"><Settings2 className="h-4 w-4 mr-2" />Configure</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Intent-Based Leads</CardTitle>
            <CardDescription>Capture leads showing buying intent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground">Set up intent signals to track</p>
            </div>
            <Button variant="outline" className="w-full"><Settings2 className="h-4 w-4 mr-2" />Configure</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
