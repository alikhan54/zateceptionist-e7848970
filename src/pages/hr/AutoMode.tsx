import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoMode, useAutoDecisions, useOverrideDecision, DEFAULT_AUTO_MODE_RULES, STAGE_LABELS } from '@/hooks/useAutoMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Info, Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Edit3, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ruleFields: Record<string, { key: string; label: string; type: 'number' | 'boolean' | 'text'; hint?: string }[]> = {
  applied_to_screening: [
    { key: 'min_match_score', label: 'Min match score (0-100)', type: 'number', hint: 'Candidates at or above this score auto-advance' },
    { key: 'auto_reject_below', label: 'Auto-reject below (0-100)', type: 'number', hint: 'Candidates under this score are rejected automatically' },
    { key: 'max_per_run', label: 'Max processed per run', type: 'number', hint: 'Safety cap so a single run cannot move thousands at once' },
  ],
  screening_to_phone: [
    { key: 'min_screening_score', label: 'Min AI screening score', type: 'number' },
    { key: 'auto_schedule_call', label: 'Auto-schedule phone call', type: 'boolean' },
    { key: 'call_window_days', label: 'Call window (days)', type: 'number' },
  ],
  phone_to_interview: [
    { key: 'min_phone_score', label: 'Min phone screen score', type: 'number' },
    { key: 'auto_schedule_ai_interview', label: 'Auto-schedule AI interview', type: 'boolean' },
  ],
  interview_to_technical: [
    { key: 'min_interview_score', label: 'Min interview score', type: 'number' },
    { key: 'send_technical_assessment', label: 'Send technical assessment', type: 'boolean' },
    { key: 'assessment_deadline_hours', label: 'Assessment deadline (hours)', type: 'number' },
  ],
  technical_to_final: [
    { key: 'min_technical_score', label: 'Min technical score', type: 'number' },
    { key: 'auto_notify_hiring_manager', label: 'Auto-notify hiring manager', type: 'boolean' },
  ],
  final_to_offer: [
    { key: 'requires_manual_approval', label: 'Requires manual approval', type: 'boolean', hint: 'Default ON — recruiters explicitly approve offers' },
    { key: 'auto_generate_offer_letter', label: 'Auto-generate offer letter', type: 'boolean' },
  ],
  offer_to_hired: [
    { key: 'auto_create_onboarding', label: 'Auto-create onboarding when accepted', type: 'boolean', hint: 'Fires the employee onboarding workflow with candidate data pre-filled' },
  ],
};

export default function AutoModePage() {
  const navigate = useNavigate();
  const { config, isLoading, updateConfig, runNow } = useAutoMode();
  const { data: decisions = [] } = useAutoDecisions(100);
  const override = useOverrideDecision();
  const [editingStage, setEditingStage] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!config) {
    return (
      <Alert className="m-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Auto-Mode not yet provisioned</AlertTitle>
        <AlertDescription>
          The auto-mode config row for your tenant could not be loaded. This usually means the schema cache is
          still refreshing after a deployment — please reload the page in a minute.
        </AlertDescription>
      </Alert>
    );
  }

  const rules = config.rules || DEFAULT_AUTO_MODE_RULES;
  const editingRule = editingStage ? rules[editingStage] : null;

  return (
    <div className="p-6 space-y-6 animate-fade-in" data-testid="automode-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Auto-Pipeline
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            AI advances candidates through the pipeline based on rules you control. Recruiters supervise, they
            don't operate — but you can pause, override, or manually move candidates at any time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => runNow.mutate()} disabled={!config.enabled || runNow.isPending} data-testid="automode-run-now">
            <Play className="h-4 w-4 mr-1" />
            {runNow.isPending ? 'Running…' : 'Run now'}
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <Bot className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium cursor-pointer" htmlFor="automode-master">
              {config.enabled ? 'Auto-Mode ACTIVE' : 'Auto-Mode OFF'}
            </Label>
            <Switch
              id="automode-master"
              checked={config.enabled}
              onCheckedChange={(v) => updateConfig.mutate({ enabled: v })}
              data-testid="automode-master-switch"
            />
          </div>
        </div>
      </div>

      {config.enabled && (
        <Alert className="border-l-4 border-l-primary">
          <Bot className="h-4 w-4" />
          <AlertTitle>Auto-Pipeline is ACTIVE</AlertTitle>
          <AlertDescription>
            AI evaluates pending candidates every <strong>{config.run_frequency_minutes} minutes</strong> and advances them based on the rules below.
            All decisions are logged in the Audit tab — you can override any move that the AI made.
            {config.last_run_at && (
              <span className="block mt-1 text-xs">
                Last run: {formatDistanceToNow(new Date(config.last_run_at), { addSuffix: true })}
                {config.last_run_summary?.decisions != null && ` · ${config.last_run_summary.decisions} decision(s)`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Stage Rules</TabsTrigger>
          <TabsTrigger value="audit" data-testid="automode-tab-audit">Decision Audit ({decisions.length})</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3 mt-4">
          {Object.keys(STAGE_LABELS).map((stageKey) => {
            const rule = rules[stageKey] || {};
            const labels = STAGE_LABELS[stageKey];
            return (
              <Card key={stageKey} data-testid={`automode-rule-${stageKey}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{labels.from}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>{labels.to}</Badge>
                        {!rule.enabled && <span className="text-xs text-muted-foreground">disabled</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(rule).filter(([k]) => k !== 'enabled').slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || 'no thresholds set'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!rule.enabled}
                        onCheckedChange={(v) => updateConfig.mutate({ rules: { ...rules, [stageKey]: { ...rule, enabled: v } } })}
                        data-testid={`automode-rule-switch-${stageKey}`}
                      />
                      <Button variant="ghost" size="sm" onClick={() => setEditingStage(stageKey)}>
                        <Edit3 className="h-4 w-4 mr-1" />Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Decision Audit Trail</CardTitle>
              <CardDescription>
                Every AI advance, reject, hold or override is logged here with its reason. Recruiters can override any decision.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No decisions yet. Run the pipeline or wait for the next cron tick.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Scores</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((d) => {
                      const icon = d.decision_type === 'advance' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 inline-block mr-1" />
                                 : d.decision_type === 'reject' ? <XCircle className="h-3.5 w-3.5 text-destructive inline-block mr-1" />
                                 : d.decision_type === 'override' ? <Edit3 className="h-3.5 w-3.5 text-amber-600 inline-block mr-1" />
                                 : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground inline-block mr-1" />;
                      return (
                        <TableRow key={d.id} data-testid={`automode-decision-${d.id}`}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</TableCell>
                          <TableCell><span className="text-sm capitalize">{icon}{d.decision_type}</span></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {d.from_stage || '—'} → <strong>{d.to_stage || 'hold'}</strong>
                          </TableCell>
                          <TableCell className="text-xs max-w-md truncate" title={d.reason || ''}>{d.reason || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {d.scores && Object.keys(d.scores).length > 0
                              ? Object.entries(d.scores).map(([k, v]) => `${k}=${v}`).join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell><Badge variant={d.is_automated ? 'secondary' : 'outline'}>{d.is_automated ? 'AI' : 'Human'}</Badge></TableCell>
                          <TableCell>
                            {d.is_automated && d.application_id && d.to_stage && d.to_stage !== 'rejected' && (
                              <Button variant="ghost" size="sm" onClick={() => override.mutate({
                                application_id: d.application_id!,
                                from_stage: d.to_stage!,
                                to_stage: d.from_stage || 'applied',
                                reason: 'Recruiter override — moved back from ' + d.to_stage,
                              })}>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Undo
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Pipeline run frequency</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Label>Check pipeline every</Label>
                <Select
                  value={String(config.run_frequency_minutes)}
                  onValueChange={(v) => updateConfig.mutate({ run_frequency_minutes: parseInt(v) })}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  (Cron interval is locked to 15 min today; this stores your preferred cadence for the next runtime upgrade.)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Notify when AI advances a candidate</Label>
                <Switch checked={config.notify_on_advance} onCheckedChange={(v) => updateConfig.mutate({ notify_on_advance: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notify when AI auto-rejects</Label>
                <Switch checked={config.notify_on_reject} onCheckedChange={(v) => updateConfig.mutate({ notify_on_reject: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingStage} onOpenChange={(o) => { if (!o) setEditingStage(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit rule: {editingStage && STAGE_LABELS[editingStage] ? `${STAGE_LABELS[editingStage].from} → ${STAGE_LABELS[editingStage].to}` : editingStage}</DialogTitle>
            <DialogDescription>Configure when AI should auto-advance candidates from this stage.</DialogDescription>
          </DialogHeader>
          {editingStage && editingRule && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rule enabled</Label>
                <Switch
                  checked={!!editingRule.enabled}
                  onCheckedChange={(v) => updateConfig.mutate({ rules: { ...rules, [editingStage]: { ...editingRule, enabled: v } } })}
                />
              </div>
              {(ruleFields[editingStage] || []).map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-sm">{field.label}</Label>
                  {field.type === 'boolean' ? (
                    <Switch
                      checked={!!editingRule[field.key]}
                      onCheckedChange={(v) => updateConfig.mutate({ rules: { ...rules, [editingStage]: { ...editingRule, [field.key]: v } } })}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={editingRule[field.key] ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
                        updateConfig.mutate({ rules: { ...rules, [editingStage]: { ...editingRule, [field.key]: val } } });
                      }}
                    />
                  )}
                  {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditingStage(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
