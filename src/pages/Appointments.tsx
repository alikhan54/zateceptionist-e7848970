import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';

export default function AppointmentsPage() {
  const { t } = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('appointments')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your {t('appointments').toLowerCase()}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New {t('appointment')}
        </Button>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {t('appointments').toLowerCase()} scheduled</p>
            <p className="text-sm">Create your first {t('appointment').toLowerCase()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
