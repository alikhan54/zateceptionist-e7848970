import { useState } from 'react';
import { useAIInterviews, useGenerateInterviewQuestions, useStartInterviewCall } from '@/hooks/useAIInterviews';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Play, FileText, CheckCircle2, XCircle, Clock, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AIInterviewsTab() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const { data: interviews = [] } = useAIInterviews();
  const generate = useGenerateInterviewQuestions();
  const startCall = useStartInterviewCall();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [viewingInterview, setViewingInterview] = useState<any | null>(null);
  const [pickedApp, setPickedApp] = useState<string>('');

  // Eligible applications = candidates already past phone_screen stage, or just any active app
  const { data: apps = [] } = useQuery({
    queryKey: ['ai-interview-eligible-apps', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await (supabase as any)
        .from('hr_job_applications')
        .select('id, stage, status, ai_match_score, candidate:hr_candidates(first_name,last_name,current_title,phone), job:hr_job_requisitions(job_title)')
        .eq('tenant_id', tenantUuid)
        .eq('status', 'active')
        .in('stage', ['applied', 'screening', 'phone_screen', 'interview']);
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const statusIcon = (s: string) =>
    s === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 inline-block mr-1" /> :
    s === 'in_progress' ? <Phone className="h-3.5 w-3.5 text-blue-600 inline-block mr-1" /> :
    s === 'no_show' || s === 'failed' ? <XCircle className="h-3.5 w-3.5 text-destructive inline-block mr-1" /> :
    <Clock className="h-3.5 w-3.5 text-muted-foreground inline-block mr-1" />;

  return (
    <div className="space-y-4" data-testid="ai-interviews-tab">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Bot className="h-5 w-5" /> AI Interviews</h3>
          <p className="text-sm text-muted-foreground">VAPI calls candidates, asks role-specific questions, scores transcripts with Claude.</p>
        </div>
        <Button onClick={() => setScheduleOpen(true)} data-testid="ai-interview-schedule-btn">
          <Phone className="h-4 w-4 mr-2" /> Schedule AI Interview
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No AI interviews yet. Click <strong>Schedule AI Interview</strong> to generate questions and dial a candidate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((iv) => (
                  <TableRow key={iv.id} data-testid={`ai-interview-row-${iv.id}`}>
                    <TableCell><span className="text-sm capitalize">{statusIcon(iv.status)}{iv.status.replace('_', ' ')}</span></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {iv.scheduled_at ? formatDistanceToNow(new Date(iv.scheduled_at), { addSuffix: true }) : '—'}
                    </TableCell>
                    <TableCell>{Array.isArray(iv.questions) ? iv.questions.length : 0}</TableCell>
                    <TableCell className="font-semibold">{iv.ai_score != null ? `${iv.ai_score}/100` : '—'}</TableCell>
                    <TableCell>
                      {iv.recommendation ? (
                        <Badge variant={iv.recommendation === 'advance' ? 'default' : iv.recommendation === 'reject' ? 'destructive' : 'secondary'}>
                          {iv.recommendation.replace('_', ' ')}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {iv.actual_duration_seconds ? `${Math.round(iv.actual_duration_seconds / 60)} min` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {iv.status === 'scheduled' && (
                          <Button variant="ghost" size="sm" onClick={() => startCall.mutate({ interview_id: iv.id })} disabled={startCall.isPending} data-testid={`ai-interview-call-${iv.id}`}>
                            <Phone className="h-3.5 w-3.5 mr-1" /> Call Now
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setViewingInterview(iv)} data-testid={`ai-interview-view-${iv.id}`}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> View
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

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule AI Interview</DialogTitle>
            <DialogDescription>
              AI generates {`5`} role-specific questions, then dials the candidate via VAPI. The transcript is scored automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Pick application</Label>
              <Select value={pickedApp} onValueChange={setPickedApp}>
                <SelectTrigger><SelectValue placeholder="Choose a candidate from active pipeline" /></SelectTrigger>
                <SelectContent>
                  {apps.length === 0 ? (
                    <SelectItem value="__none" disabled>No eligible applications</SelectItem>
                  ) : apps.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.candidate?.first_name} {a.candidate?.last_name} — {a.job?.job_title} ({a.stage}, {a.ai_match_score ?? 0}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pickedApp && (() => {
                const a = apps.find((x: any) => x.id === pickedApp);
                return a ? (
                  <p className="text-xs text-muted-foreground">
                    {a.candidate?.phone ? `Phone: ${a.candidate.phone}` : 'No phone — VAPI call will fail. Add a phone to the candidate first.'}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button disabled={!pickedApp || generate.isPending} onClick={async () => {
              await generate.mutateAsync({ application_id: pickedApp });
              setScheduleOpen(false);
              setPickedApp('');
            }}>
              {generate.isPending ? 'Generating…' : 'Generate Questions + Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail viewer */}
      <Dialog open={!!viewingInterview} onOpenChange={(o) => { if (!o) setViewingInterview(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Interview details</DialogTitle>
            <DialogDescription>{viewingInterview?.id}</DialogDescription>
          </DialogHeader>
          {viewingInterview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3"><Label className="text-xs">Score</Label><p className="text-2xl font-bold">{viewingInterview.ai_score ?? '—'}{viewingInterview.ai_score != null ? '/100' : ''}</p></CardContent></Card>
                <Card><CardContent className="p-3"><Label className="text-xs">Duration</Label><p className="text-2xl font-bold">{viewingInterview.actual_duration_seconds ? Math.round(viewingInterview.actual_duration_seconds/60)+' min' : '—'}</p></CardContent></Card>
                <Card><CardContent className="p-3"><Label className="text-xs">Recommendation</Label><p className="text-lg font-semibold capitalize">{viewingInterview.recommendation?.replace('_', ' ') || '—'}</p></CardContent></Card>
              </div>
              {viewingInterview.strengths && (
                <div><Label>Strengths</Label><p className="text-sm">{viewingInterview.strengths}</p></div>
              )}
              {viewingInterview.concerns && (
                <div><Label>Concerns</Label><p className="text-sm">{viewingInterview.concerns}</p></div>
              )}
              {Array.isArray(viewingInterview.questions) && viewingInterview.questions.length > 0 && (
                <div>
                  <Label>Questions ({viewingInterview.questions.length})</Label>
                  <div className="space-y-1.5 mt-1">
                    {viewingInterview.questions.map((q: any, i: number) => (
                      <div key={i} className="text-sm border rounded p-2">
                        <span className="text-xs uppercase text-muted-foreground mr-2">{q.type}</span>
                        <span>{q.question}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingInterview.recording_url && (
                <div>
                  <Label>Recording</Label>
                  <audio controls src={viewingInterview.recording_url} className="w-full mt-1" />
                </div>
              )}
              {viewingInterview.transcript && (
                <div>
                  <Label>Transcript</Label>
                  <ScrollArea className="h-64 border rounded p-3 mt-1">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{viewingInterview.transcript}</pre>
                  </ScrollArea>
                </div>
              )}
              {viewingInterview.ai_reasoning && (
                <div>
                  <Label>AI Reasoning</Label>
                  <p className="text-sm italic">{viewingInterview.ai_reasoning}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingInterview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
