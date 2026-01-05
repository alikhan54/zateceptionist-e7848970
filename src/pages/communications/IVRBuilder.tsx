import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Voicemail, Plus, Play, Settings2 } from 'lucide-react';

export default function IVRBuilder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IVR Builder</h1>
          <p className="text-muted-foreground mt-1">Build interactive voice response flows</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New IVR Flow</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IVR Flows</CardTitle>
          <CardDescription>Your voice menu configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Voicemail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No IVR flows created</p>
            <p className="text-sm">Create your first IVR flow</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
