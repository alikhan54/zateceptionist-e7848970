import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function LeadsPage() {
  const { translate } = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate('leads')}</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your {translate('leads').toLowerCase()}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add {translate('lead')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${translate('leads').toLowerCase()}...`} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {translate('leads').toLowerCase()} yet</p>
            <p className="text-sm">Add your first {translate('lead').toLowerCase()} to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
