import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Plus } from 'lucide-react';

export default function Vendors() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-1">Manage your suppliers</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vendors added yet</p>
            <p className="text-sm">Add your first vendor</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
