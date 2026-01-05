import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search } from 'lucide-react';

export default function AllTenants() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage all organizations</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Create Tenant</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tenants..." className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenants found</p>
            <p className="text-sm">Create your first tenant to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
