import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Plus, Trash2, Mail, Info } from 'lucide-react';

interface SendingAccount {
  id: string;
  tenant_id: string;
  account_name: string;
  email_address: string;
  display_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  health_status: string;
  health_score: number;
  daily_limit: number;
  sent_today: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

const healthColors: Record<string, string> = {
  healthy: 'bg-green-500/15 text-green-700 border-green-500/30',
  warming: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  throttled: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  paused: 'bg-red-500/15 text-red-700 border-red-500/30',
};

export default function SendingAccountsTab({ tenantId }: { tenantId: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    email_address: '',
    display_name: '',
    smtp_host: 'smtp.hostinger.com',
    smtp_port: '465',
    smtp_username: '',
    smtp_password: '',
    daily_limit: 50,
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['sending_accounts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('sending_accounts' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });
      return (data || []) as unknown as SendingAccount[];
    },
    enabled: !!tenantId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sending_accounts' as any).insert({
        tenant_id: tenantId,
        account_name: newAccount.account_name,
        email_address: newAccount.email_address,
        display_name: newAccount.display_name,
        smtp_host: newAccount.smtp_host,
        smtp_port: parseInt(newAccount.smtp_port),
        smtp_username: newAccount.smtp_username,
        smtp_password: newAccount.smtp_password,
        daily_limit: newAccount.daily_limit,
        is_primary: accounts.length === 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending_accounts'] });
      setAddOpen(false);
      setNewAccount({ account_name: '', email_address: '', display_name: '', smtp_host: 'smtp.hostinger.com', smtp_port: '465', smtp_username: '', smtp_password: '', daily_limit: 50 });
      toast({ title: 'Account Added', description: 'Sending account has been added' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to add account', variant: 'destructive' }),
  });

  const updateField = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase.from('sending_accounts' as any).update({ [field]: value } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sending_accounts'] }),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('sending_accounts' as any).update({ is_primary: false } as any).eq('tenant_id', tenantId);
      const { error } = await supabase.from('sending_accounts' as any).update({ is_primary: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending_accounts'] });
      toast({ title: 'Primary Updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sending_accounts' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending_accounts'] });
      setDeleteId(null);
      toast({ title: 'Account Deleted' });
    },
  });

  return (
    <TabsContent value="sending-accounts" className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Inbox Rotation</p>
          <p className="text-sm text-muted-foreground">
            Add multiple sending accounts to distribute email volume and protect your domain reputation. Emails rotate automatically across all active accounts.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sending Accounts</CardTitle>
            <CardDescription>Manage SMTP accounts for email rotation</CardDescription>
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Sending Account
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No sending accounts configured yet.</p>
              <p className="text-xs mt-1">Add your first SMTP account to start sending emails.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Account Name */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Account Name</Label>
                        <Input
                          value={acc.account_name}
                          className="h-8 text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== acc.account_name)
                              updateField.mutate({ id: acc.id, field: 'account_name', value: e.target.value });
                          }}
                          onChange={(e) => {
                            // Optimistic local update handled by React Query refetch
                          }}
                          defaultValue={acc.account_name}
                        />
                      </div>
                      {/* Email */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email Address</Label>
                        <p className="text-sm font-medium truncate pt-1">{acc.email_address}</p>
                      </div>
                      {/* Display Name */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Display Name</Label>
                        <Input
                          defaultValue={acc.display_name}
                          className="h-8 text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== acc.display_name)
                              updateField.mutate({ id: acc.id, field: 'display_name', value: e.target.value });
                          }}
                        />
                      </div>
                      {/* SMTP */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SMTP Server</Label>
                        <p className="text-sm text-muted-foreground pt-1">{acc.smtp_host}:{acc.smtp_port}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(acc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Health */}
                    <Badge variant="outline" className={healthColors[acc.health_status] || ''}>
                      {acc.health_status}
                    </Badge>

                    {/* Health Score */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="text-xs text-muted-foreground">Health</span>
                      <Progress value={acc.health_score || 0} className="h-2 flex-1" />
                      <span className="text-xs font-medium">{acc.health_score ?? 0}%</span>
                    </div>

                    {/* Sent Today */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <span className="text-xs text-muted-foreground">Sent</span>
                      <Progress value={acc.daily_limit ? ((acc.sent_today || 0) / acc.daily_limit) * 100 : 0} className="h-2 flex-1" />
                      <span className="text-xs font-medium">{acc.sent_today || 0}/{acc.daily_limit}</span>
                    </div>

                    {/* Daily Limit */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Limit</Label>
                      <Input
                        type="number"
                        defaultValue={acc.daily_limit}
                        className="h-8 w-20 text-sm"
                        onBlur={(e) => {
                          const v = parseInt(e.target.value);
                          if (v && v !== acc.daily_limit) updateField.mutate({ id: acc.id, field: 'daily_limit', value: v });
                        }}
                      />
                    </div>

                    {/* Primary */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Primary</Label>
                      <Switch
                        checked={acc.is_primary}
                        onCheckedChange={() => { if (!acc.is_primary) setPrimary.mutate(acc.id); }}
                      />
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Active</Label>
                      <Switch
                        checked={acc.is_active}
                        onCheckedChange={(v) => updateField.mutate({ id: acc.id, field: 'is_active', value: v })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sending Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={newAccount.account_name} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} placeholder="e.g. Sales Outreach 1" />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={newAccount.email_address} onChange={(e) => setNewAccount({ ...newAccount, email_address: e.target.value })} placeholder="sender@yourdomain.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={newAccount.display_name} onChange={(e) => setNewAccount({ ...newAccount, display_name: e.target.value })} placeholder="John from Company" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input value={newAccount.smtp_host} onChange={(e) => setNewAccount({ ...newAccount, smtp_host: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Select value={newAccount.smtp_port} onValueChange={(v) => setNewAccount({ ...newAccount, smtp_port: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="465">465 (SSL)</SelectItem>
                    <SelectItem value="587">587 (TLS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>SMTP Username</Label>
              <Input value={newAccount.smtp_username} onChange={(e) => setNewAccount({ ...newAccount, smtp_username: e.target.value })} placeholder="Usually your email address" />
            </div>
            <div className="space-y-2">
              <Label>SMTP Password</Label>
              <Input type="password" value={newAccount.smtp_password} onChange={(e) => setNewAccount({ ...newAccount, smtp_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Daily Send Limit</Label>
              <Input type="number" value={newAccount.daily_limit} onChange={(e) => setNewAccount({ ...newAccount, daily_limit: parseInt(e.target.value) || 50 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newAccount.email_address || !newAccount.account_name}>
              {addMutation.isPending ? 'Adding...' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Sending Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this sending account? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
