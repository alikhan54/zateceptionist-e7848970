import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, Phone, Users, Clock } from 'lucide-react';

export default function CallCenter() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Center</h1>
          <p className="text-muted-foreground mt-1">Manage inbound and outbound calls</p>
        </div>
        <Button variant="outline">Configure</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="h-6 w-6 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Active Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">In Queue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Headphones className="h-6 w-6 mx-auto text-chart-3 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Agents Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">0:00</p>
            <p className="text-sm text-muted-foreground">Avg Wait Time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Headphones className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No calls in queue</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
