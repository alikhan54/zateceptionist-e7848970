import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  Mail, Phone, MessageCircle, MessageSquare, ChevronDown, Play,
  Sparkles, Inbox, Clock, Send, Loader2,
} from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import {
  useCandidateActivity, useOutreachFeed, useApproveOutreach, type RecruitmentActivityItem,
} from '@/hooks/useRecruitment';

const CHANNEL = {
  email: { icon: Mail, label: 'Email', cls: 'text-chart-3 bg-chart-3/10 border-chart-3/20' },
  call: { icon: Phone, label: 'AI Call', cls: 'text-primary bg-primary/10 border-primary/20' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', cls: 'text-chart-2 bg-chart-2/10 border-chart-2/20' },
  sms: { icon: MessageSquare, label: 'SMS', cls: 'text-chart-4 bg-chart-4/10 border-chart-4/20' },
} as const;

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  delivered: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  opened: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  clicked: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  replied: 'bg-chart-2/15 text-chart-2 border-chart-2/30',
  bounced: 'bg-destructive/10 text-destructive border-destructive/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  opted_out: 'bg-muted text-muted-foreground',
  pending: 'bg-muted text-muted-foreground',
  completed: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  no_show: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  scheduled: 'bg-muted text-muted-foreground',
};
const STATUS_LABEL: Record<string, string> = {
  no_show: 'No answer', in_progress: 'In progress', opted_out: 'Opted out',
};
const REC_STYLES: Record<string, string> = {
  advance: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  second_round: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  hold: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  reject: 'bg-destructive/10 text-destructive border-destructive/20',
};
const REC_LABEL: Record<string, string> = {
  advance: 'Advance', second_round: 'Second round', hold: 'Hold', reject: 'Reject',
};

function scoreRingCls(s: number) {
  if (s >= 70) return 'border-chart-2/50 text-chart-2';
  if (s >= 50) return 'border-chart-4/50 text-chart-4';
  return 'border-destructive/50 text-destructive';
}
const prettyStatus = (s: string) => STATUS_LABEL[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

function relTime(ts: string | null) {
  if (!ts) return { rel: '—', abs: '' };
  try {
    const d = parseISO(ts);
    return { rel: formatDistanceToNow(d, { addSuffix: true }), abs: format(d, 'PPpp') };
  } catch { return { rel: ts, abs: ts }; }
}

// Parse a transcript (string or array) into speaker-labelled turns — never raw JSON.
function parseTranscript(t: unknown): { speaker: string; text: string }[] {
  if (!t) return [];
  if (Array.isArray(t)) {
    return t.map((m: any) => ({
      speaker: String(m?.role || m?.speaker || ''),
      text: String(m?.message || m?.content || (typeof m === 'string' ? m : '')),
    })).filter((x) => x.text.trim());
  }
  let text = '';
  if (typeof t === 'string') text = t;
  else if (typeof t === 'object' && t && typeof (t as any).transcript === 'string') text = (t as any).transcript;
  if (!text.trim()) return [];
  return text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    const m = line.match(/^\s*(AI|Assistant|Bot|User|Customer|Candidate)\s*:\s*(.*)$/i);
    return m ? { speaker: m[1], text: m[2] } : { speaker: '', text: line };
  });
}
const isAISpeaker = (s: string) => /^(ai|assistant|bot)$/i.test(s);

// Tier-0 B6: one-tap (with confirm) approval for a 'pending' outreach row.
// POSTs /hr/recruitment/approve-outreach; the row flips to 'sent' optimistically.
export function ApproveOutreachButton({ outreachId, candidateName, compact }: {
  outreachId: string;
  candidateName?: string;
  compact?: boolean;
}) {
  const approve = useApproveOutreach();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className={cn('gap-1.5', compact ? 'h-5 px-1.5 text-[10px]' : 'h-7 text-xs')}
          disabled={approve.isPending}
          onClick={(e) => e.stopPropagation()}
          data-testid={`approve-outreach-${outreachId}`}
        >
          {approve.isPending ? <Loader2 className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3', 'animate-spin')} /> : <Send className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
          Approve & send
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Send this outreach email?</AlertDialogTitle>
          <AlertDialogDescription>
            The prepared email{candidateName ? ` to ${candidateName}` : ''} will be sent immediately from your
            company mailbox. This can&apos;t be unsent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => approve.mutate({ outreachId })}>Send now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActivityCard({ item, showCandidate }: { item: RecruitmentActivityItem; showCandidate?: boolean }) {
  const [open, setOpen] = useState(false);
  const ch = CHANNEL[item.kind] ?? CHANNEL.email;
  const Icon = ch.icon;
  const { rel, abs } = relTime(item.timestamp);
  const turns = item.kind === 'call' ? parseTranscript(item.transcript) : [];
  const hasDetail = (item.kind === 'call' && (turns.length > 0 || item.recording_url || item.ai_score != null))
    || (item.kind !== 'call' && !!item.body);

  return (
    <div className="rounded-xl border bg-card/40 hover:bg-card/70 transition-colors" data-testid={`activity-${item.id}`}>
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn('w-full flex items-start gap-3 p-3 text-left', hasDetail && 'cursor-pointer')}
      >
        <div className={cn('mt-0.5 h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center', ch.cls)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {showCandidate && item.candidate_name && (
              <span className="font-semibold truncate">{item.candidate_name}</span>
            )}
            <span className={cn('text-sm truncate', showCandidate && item.candidate_name ? 'text-muted-foreground' : 'font-medium')}>
              {item.title}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className={cn('h-5 px-1.5', ch.cls)}>{ch.label}</Badge>
            <Badge variant="outline" className={cn('h-5 px-1.5', STATUS_STYLES[item.status] || 'bg-muted text-muted-foreground')}>
              {prettyStatus(item.status)}
            </Badge>
            {item.kind === 'call' && item.recommendation && (
              <Badge variant="outline" className={cn('h-5 px-1.5', REC_STYLES[item.recommendation] || 'bg-muted text-muted-foreground')}>
                {REC_LABEL[item.recommendation] || item.recommendation}
              </Badge>
            )}
            {item.role && <span className="text-muted-foreground">· {item.role}</span>}
            <span className="text-muted-foreground inline-flex items-center gap-1" title={abs}>
              <Clock className="h-3 w-3" />{rel}
            </span>
          </div>
        </div>
        {item.kind === 'call' && item.ai_score != null && (
          <div className={cn('shrink-0 h-10 w-10 rounded-full border-2 flex items-center justify-center text-sm font-bold', scoreRingCls(item.ai_score))} title="AI score">
            {item.ai_score}
          </div>
        )}
        {hasDetail && <ChevronDown className={cn('h-4 w-4 mt-1 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />}
      </button>

      {item.kind !== 'call' && item.status === 'pending' && item.outreach_id && (
        <div className="px-3 pb-3 pl-[3.75rem] flex items-center gap-2">
          <ApproveOutreachButton outreachId={item.outreach_id} candidateName={item.candidate_name} />
          <span className="text-xs text-muted-foreground">Prepared and awaiting your approval{hasDetail ? ' — tap the card to read it first' : ''}</span>
        </div>
      )}

      {open && hasDetail && (
        <div className="px-3 pb-3 pt-0 pl-[3.75rem]">
          {item.kind !== 'call' && item.body && (
            <div
              className="rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground [&_p]:my-1.5 [&_strong]:text-foreground [&_a]:text-primary"
              dangerouslySetInnerHTML={{ __html: item.body }}
            />
          )}
          {item.kind === 'call' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {item.recording_url && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(item.recording_url!, '_blank')}>
                    <Play className="h-3.5 w-3.5" />Play recording
                  </Button>
                )}
                {item.ai_score != null && (
                  <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />AI score <span className={cn('font-semibold', scoreRingCls(item.ai_score).split(' ')[1])}>{item.ai_score}/100</span>
                  </span>
                )}
                {item.duration_seconds != null && (
                  <span className="text-sm text-muted-foreground">{Math.floor(item.duration_seconds / 60)}m {item.duration_seconds % 60}s</span>
                )}
              </div>
              {turns.length > 0 ? (
                <div className="rounded-lg border bg-background/60 p-3 space-y-2 max-h-72 overflow-y-auto">
                  {turns.map((t, i) => (
                    <div key={i} className="text-sm">
                      {t.speaker && (
                        <span className={cn('font-semibold mr-1.5', isAISpeaker(t.speaker) ? 'text-primary' : 'text-chart-2')}>
                          {isAISpeaker(t.speaker) ? 'AI' : 'Candidate'}:
                        </span>
                      )}
                      <span className={cn(t.speaker && !isAISpeaker(t.speaker) ? 'text-foreground' : 'text-muted-foreground')}>{t.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No transcript captured for this call.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OutreachActivity({ items, isLoading, showCandidate, emptyText }: {
  items: RecruitmentActivityItem[];
  isLoading?: boolean;
  showCandidate?: boolean;
  emptyText?: string;
}) {
  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  }
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <Inbox className="h-9 w-9 mx-auto text-muted-foreground/40 mb-2" />
        <p className="font-medium text-muted-foreground">{emptyText || 'No outreach yet'}</p>
        <p className="text-sm text-muted-foreground/70 mt-0.5">Email, calls and messages will appear here as they happen.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it) => <ActivityCard key={it.id} item={it} showCandidate={showCandidate} />)}
    </div>
  );
}

// Self-fetching: per-candidate activity timeline (for the candidate profile dialog).
export function CandidateActivity({ candidateId }: { candidateId?: string }) {
  const { data, isLoading } = useCandidateActivity(candidateId);
  return <OutreachActivity items={data || []} isLoading={isLoading} emptyText="No outreach yet for this candidate" />;
}

// Self-fetching: global outreach feed with a channel filter (for the Outreach tab).
const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'email', label: 'Email' },
  { key: 'call', label: 'Calls' }, { key: 'whatsapp', label: 'WhatsApp' }, { key: 'sms', label: 'SMS' },
];
export function OutreachFeed() {
  const { data, isLoading } = useOutreachFeed();
  const [filter, setFilter] = useState('all');
  const items = (data || []).filter((i) => filter === 'all' || i.kind === filter);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap" data-testid="outreach-filters">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? (data || []).length : (data || []).filter((i) => i.kind === f.key).length;
          return (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setFilter(f.key)}
            >
              {f.label}{count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </Button>
          );
        })}
      </div>
      <OutreachActivity items={items} isLoading={isLoading} showCandidate emptyText="No outreach sent yet" />
    </div>
  );
}
