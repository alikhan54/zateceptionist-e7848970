import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Target, Mail, Copy, ArrowLeft, ArrowUpDown, AlertTriangle, UserX, Clock, Send,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  useAllTenants, useAllUsers, useLifecycleSignals, LIFECYCLE_CONFIG, LifecycleStage,
} from '@/hooks/useAdminData';

// The attention set: tenants the operator should be chasing. All three stages are
// real outputs of derive_lifecycle_signals — nothing here is fabricated.
const ATTENTION_STAGES: LifecycleStage[] = ['never_activated', 'at_risk', 'churned'];

// Best owner contact for a tenant: prefer an active admin, then any admin, then
// any active user, then anyone. Honest null when the tenant has no users at all.
const ROLE_RANK: Record<string, number> = { admin: 0, manager: 1, staff: 2 };

export default function AdminActivation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tenants, isLoading: tenantsLoading } = useAllTenants();
  const { data: lifecycle, isLoading: lifecycleLoading } = useLifecycleSignals();
  const { data: users } = useAllUsers();

  const [stageFilter, setStageFilter] = useState<'all' | LifecycleStage>('all');
  const [sortDesc, setSortDesc] = useState(true);

  const isLoading = tenantsLoading || lifecycleLoading;

  const rows = useMemo(() => {
    const tenantMap = new Map((tenants || []).map((t) => [t.tenant_id, t]));
    // Per-tenant best contact from the real cross-tenant user list.
    const contactMap = new Map<string, { email: string; name: string | null }>();
    for (const u of users || []) {
      if (!u.email || u.role === 'master_admin') continue;
      const cur = contactMap.get(u.tenant_id);
      if (!cur) { contactMap.set(u.tenant_id, { email: u.email, name: u.full_name }); continue; }
      const curUser = (users || []).find((x) => x.email === cur.email && x.tenant_id === u.tenant_id);
      const curRank = (curUser ? ROLE_RANK[curUser.role || 'staff'] : 9) ?? 9;
      const newRank = (ROLE_RANK[u.role || 'staff'] ?? 9) - (u.is_active ? 0.5 : 0);
      if (newRank < curRank) contactMap.set(u.tenant_id, { email: u.email, name: u.full_name });
    }

    return (lifecycle || [])
      .filter((l) => ATTENTION_STAGES.includes(l.lifecycle_stage))
      .filter((l) => stageFilter === 'all' || l.lifecycle_stage === stageFilter)
      .map((l) => {
        const t = tenantMap.get(l.tenant_id);
        // Days dormant: never logged in => dormant since signup; otherwise days since last login.
        const daysDormant = l.lifecycle_stage === 'never_activated'
          ? (l.days_since_signup ?? 0)
          : (l.days_silent ?? 0);
        return {
          tenant_id: l.tenant_id,
          company: l.company_name || t?.company_name || l.tenant_id,
          industry: t?.industry || '—',
          plan: t?.plan || 'free',
          signup: l.signup_date,
          daysDormant,
          stage: l.lifecycle_stage,
          lastActive: l.last_active,
          usersCount: t?.users_count ?? 0,
          contact: contactMap.get(l.tenant_id) || null,
        };
      })
      .sort((a, b) => (sortDesc ? b.daysDormant - a.daysDormant : a.daysDormant - b.daysDormant));
  }, [tenants, lifecycle, users, stageFilter, sortDesc]);

  const counts = useMemo(() => {
    const att = (lifecycle || []).filter((l) => ATTENTION_STAGES.includes(l.lifecycle_stage));
    return {
      never: att.filter((l) => l.lifecycle_stage === 'never_activated').length,
      atRisk: att.filter((l) => l.lifecycle_stage === 'at_risk').length,
      churned: att.filter((l) => l.lifecycle_stage === 'churned').length,
      noUsers: att.filter((l) => {
        const t = (tenants || []).find((x) => x.tenant_id === l.tenant_id);
        return (t?.users_count ?? 0) === 0;
      }).length,
    };
  }, [lifecycle, tenants]);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast({ title: 'Copied', description: email });
    } catch {
      toast({ title: 'Copy failed', description: email, variant: 'destructive' });
    }
  };

  const mailtoHref = (email: string, company: string) =>
    `mailto:${email}?subject=${encodeURIComponent(`Getting started with ${company} on Zate Systems`)}`;

  const stageChip = (stage: 'all' | LifecycleStage, label: string, count?: number) => (
    <Button
      key={stage}
      variant={stageFilter === stage ? 'default' : 'outline'}
      size="sm"
      onClick={() => setStageFilter(stage)}
      data-testid={`activation-filter-${stage}`}
    >
      {label}{count != null ? ` (${count})` : ''}
    </Button>
  );

  return (
    <div className="space-y-6" data-testid="activation-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Target className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Activation Command</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            The chase-list: tenants that signed up but never activated, went quiet, or churned —
            with the contact to reach right now. Derived from real sign-in activity.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />All tenants
        </Button>
      </div>

      {/* Attention stats (real) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-2xl font-bold">{isLoading ? '—' : counts.never}</p></div>
          <p className="text-sm text-muted-foreground mt-1">Never activated</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" />
            <p className="text-2xl font-bold">{isLoading ? '—' : counts.atRisk}</p></div>
          <p className="text-sm text-muted-foreground mt-1">At risk (7–30d silent)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><UserX className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{isLoading ? '—' : counts.churned}</p></div>
          <p className="text-sm text-muted-foreground mt-1">Churned (30d+ silent)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{isLoading ? '—' : counts.noUsers}</p></div>
          <p className="text-sm text-muted-foreground mt-1">No users yet (unreachable by email)</p>
        </CardContent></Card>
      </div>

      {/* Worklist */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle>Worklist</CardTitle>
              <CardDescription>
                {rows.length} tenant{rows.length === 1 ? '' : 's'} needing attention · sorted by days dormant
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {stageChip('all', 'All attention', counts.never + counts.atRisk + counts.churned)}
              {stageChip('never_activated', 'Never activated', counts.never)}
              {stageChip('at_risk', 'At risk', counts.atRisk)}
              {stageChip('churned', 'Churned', counts.churned)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Nothing needs attention in this segment. 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => setSortDesc((d) => !d)}>
                    <span className="inline-flex items-center gap-1">Days dormant<ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Act</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.tenant_id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/tenants/${r.tenant_id}`)}
                    data-testid={`activation-row-${r.tenant_id}`}>
                    <TableCell>
                      <p className="font-medium">{r.company}</p>
                      <p className="text-xs text-muted-foreground">{r.tenant_id}</p>
                    </TableCell>
                    <TableCell>{r.industry}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{r.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={LIFECYCLE_CONFIG[r.stage].className} title={LIFECYCLE_CONFIG[r.stage].hint}>
                        {LIFECYCLE_CONFIG[r.stage].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground" title={r.signup ? new Date(r.signup).toLocaleString() : undefined}>
                      {r.signup ? format(new Date(r.signup), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{r.daysDormant}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">
                        {r.stage === 'never_activated'
                          ? 'since signup'
                          : r.lastActive ? `since login ${formatDistanceToNow(new Date(r.lastActive), { addSuffix: true })}` : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.contact ? (
                        <div className="min-w-0">
                          <p className="text-sm truncate max-w-[180px]" title={r.contact.email}>{r.contact.email}</p>
                          {r.contact.name && <p className="text-xs text-muted-foreground truncate">{r.contact.name}</p>}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">No users yet</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {r.contact && (
                          <>
                            <Button asChild variant="outline" size="sm" data-testid={`activation-mail-${r.tenant_id}`}>
                              <a href={mailtoHref(r.contact.email, r.company)}><Mail className="h-4 w-4 mr-1.5" />Email</a>
                            </Button>
                            <Button variant="ghost" size="icon" title="Copy email"
                              onClick={() => copyEmail(r.contact!.email)} data-testid={`activation-copy-${r.tenant_id}`}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Automated re-engagement is the n8n follow-on — disabled, cannot fake success. */}
                        <Button variant="ghost" size="sm" disabled
                          title="Automated re-engagement sequences — coming soon (n8n follow-on)">
                          <Send className="h-4 w-4 mr-1.5" />Re-engage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
