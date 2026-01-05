import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Plus, Eye } from 'lucide-react';

export default function LandingPages() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground mt-1">Create high-converting landing pages</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Page</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Landing Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No landing pages yet</p>
            <p className="text-sm">Create your first landing page</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
