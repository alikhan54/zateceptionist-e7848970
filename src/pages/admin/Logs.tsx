import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList, Search, Download, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AuditLogs() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">System activity and changes</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export Logs</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-10" />
            </div>
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
            <p className="text-sm">System activity will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
