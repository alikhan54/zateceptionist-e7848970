import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ClipboardList, Search, Download, RefreshCw, Eye, Calendar,
  User, Building2, Activity, AlertTriangle, CheckCircle, XCircle,
  Settings, Database, Shield, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuditLogs, useAllTenants, useAuditLogStats, AuditLog } from '@/hooks/useAdminData';
import { formatDistanceToNow, format } from 'date-fns';

const actionTypes = [
  'All Actions',
  'user.login',
  'user.logout',
  'user.permission_denied',
  'deal.create',
  'deal.update',
  'campaign.create',
  'lead.import',
  'settings.update',
  'api.rate_limit',
  'backup.complete',
];

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState('All Tenants');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: logs, isLoading, refetch } = useAuditLogs();
  const { data: tenants } = useAllTenants();
  const { data: logStats, isLoading: statsLoading } = useAuditLogStats();

  // Get tenant list for filter
  const tenantList = ['All Tenants', ...(tenants || []).map(t => t.company_name)];

  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.action?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTenant = tenantFilter === 'All Tenants' || log.tenant_name === tenantFilter;
    const matchesAction = actionFilter === 'All Actions' || log.action === actionFilter;
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesTenant && matchesAction && matchesLevel;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4 text-chart-2" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      success: { variant: 'default' },
      info: { variant: 'secondary' },
      warning: { variant: 'outline' },
      error: { variant: 'destructive' },
    };
    return <Badge variant={config[level]?.variant || 'secondary'} className="capitalize">{level}</Badge>;
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'sales': return <Activity className="h-4 w-4" />;
      case 'marketing': return <Activity className="h-4 w-4" />;
      case 'admin': return <Settings className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'api': return <Activity className="h-4 w-4" />;
      case 'tenant': return <Building2 className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">System activity and security events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isStreaming ? 'default' : 'outline'} 
            size="sm"
            onClick={() => {
              setIsStreaming(!isStreaming);
              if (!isStreaming) refetch();
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isStreaming ? 'animate-spin' : ''}`} />
            {isStreaming ? 'Streaming...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{(logStats?.total || 0).toLocaleString()}</p>
                )}
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{(logStats?.today || 0).toLocaleString()}</p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-yellow-500">{logStats?.warnings || 0}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-destructive">{logStats?.errors || 0}</p>
                )}
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Log List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenantList.map(tenant => (
                    <SelectItem key={tenant} value={tenant}>{tenant}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        {getResourceIcon(log.resource)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">{log.action}</code>
                          {getLevelBadge(log.level)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-md">{log.details}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      <span>{log.tenant_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span className="max-w-32 truncate">{log.user_email || 'System'}</span>
                    </div>
                    <div className="flex items-center gap-2 w-36">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm">Logs will appear here as actions are performed in the system</p>
            </div>
          )}

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Showing {filteredLogs.length} events</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">1</Button>
                <Button variant="outline" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getLevelIcon(selectedLog.level)}
              Log Details
            </DialogTitle>
            <DialogDescription>
              Full event information and metadata
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">{format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Level</Label>
                  <div>{getLevelBadge(selectedLog.level)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Action</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedLog.action}</code>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Resource</Label>
                  <p className="capitalize">{selectedLog.resource}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Tenant</Label>
                  <p>{selectedLog.tenant_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">User</Label>
                  <p>{selectedLog.user_email || 'System'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">IP Address</Label>
                  <code className="text-sm font-mono">{selectedLog.ip_address}</code>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">Details</Label>
                <p>{selectedLog.details}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Raw Event Data</Label>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify({
                    id: selectedLog.id,
                    timestamp: selectedLog.created_at,
                    tenant_id: selectedLog.tenant_id,
                    user_email: selectedLog.user_email,
                    action: selectedLog.action,
                    resource: selectedLog.resource,
                    details: selectedLog.details,
                    ip_address: selectedLog.ip_address,
                    level: selectedLog.level,
                    metadata: selectedLog.metadata,
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Retention Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Settings</CardTitle>
          <CardDescription>Configure log retention policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Retention Period</p>
              <p className="text-sm text-muted-foreground">Logs older than 90 days are automatically archived</p>
            </div>
            <Button variant="outline">Configure</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
