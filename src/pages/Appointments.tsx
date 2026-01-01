import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';

export default function AppointmentsPage() {
  const { translate } = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate('appointments')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your {translate('appointments').toLowerCase()}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New {translate('appointment')}
        </Button>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {translate('appointments').toLowerCase()} scheduled</p>
            <p className="text-sm">Create your first {translate('appointment').toLowerCase()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
