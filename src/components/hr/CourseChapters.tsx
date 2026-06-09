import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Film, Loader2, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Clock, User } from 'lucide-react';
import { useCourseChapters } from '@/hooks/useHR';
import { useTenant } from '@/contexts/TenantContext';

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  ready: { label: 'Ready', cls: 'bg-chart-2/10 text-chart-2 border-chart-2/20', icon: CheckCircle2 },
  generating: { label: 'Generating', cls: 'bg-primary/10 text-primary border-primary/20', icon: Loader2 },
  queued: { label: 'Queued', cls: 'bg-muted text-muted-foreground', icon: Clock },
  failed: { label: 'Failed', cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
};

/**
 * Chaptered training-video player: one HeyGen avatar video per course section.
 * Self-fetches via useCourseChapters (auto-polls every 8s while any chapter generates).
 * 'ready' chapters play inline; 'generating' show a placeholder; 'failed' show the error.
 */
export function CourseChapters({ programId, onGenerate, onRefresh, generating }: {
  programId?: string;
  onGenerate?: (avatarMode: string) => void;
  onRefresh?: () => void;
  generating?: boolean;
}) {
  const { tenantConfig } = useTenant();
  const feats = (tenantConfig?.features || {}) as Record<string, any>;
  const customAvatarLabel = feats.heygen_avatar_label as string | undefined;
  const customAvatarPreview = feats.heygen_avatar_preview_url as string | undefined;
  const hasCustomAvatar = !!feats.heygen_talking_photo_id;
  const [avatarMode, setAvatarMode] = useState<string>(hasCustomAvatar ? 'custom' : 'default');

  const { data: chapters = [], isLoading } = useCourseChapters(programId);
  const ready = chapters.filter((c: any) => c.status === 'ready').length;
  const total = chapters.length;
  const anyGenerating = chapters.some((c: any) => c.status === 'generating' || c.status === 'queued');

  return (
    <div className="rounded-xl border bg-card/40 p-4 space-y-3" data-testid="course-chapters">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span className="font-semibold">Chapter Videos</span>
          {total > 0 && (
            <Badge variant="outline" className="text-xs" data-testid="chapters-progress">{ready}/{total} ready</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasCustomAvatar && onGenerate && (
            <div className="flex items-center gap-1.5" data-testid="avatar-picker">
              {avatarMode === 'custom' && customAvatarPreview && (
                <img src={customAvatarPreview} alt="lecturer avatar" className="h-8 w-8 rounded-full object-cover border" data-testid="avatar-preview" />
              )}
              <Select value={avatarMode} onValueChange={setAvatarMode}>
                <SelectTrigger className="h-8 w-[190px] text-xs">
                  <span className="flex items-center gap-1.5 truncate"><User className="h-3.5 w-3.5 shrink-0" /><SelectValue /></span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" data-testid="avatar-custom">{customAvatarLabel || 'Custom avatar'}</SelectItem>
                  <SelectItem value="default">Default (Anna)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {anyGenerating && onRefresh && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={onRefresh} data-testid="chapters-refresh">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
          )}
          {onGenerate && (
            <Button size="sm" className="gap-1.5 h-8" onClick={() => onGenerate(avatarMode)} disabled={generating} data-testid="chapters-generate">
              <Sparkles className="h-3.5 w-3.5" />{generating ? 'Starting…' : (total > 0 ? 'Regenerate' : 'Generate Chapter Videos')}
            </Button>
          )}
        </div>
      </div>

      {total > 0 && <Progress value={total ? (ready / total) * 100 : 0} className="h-1.5" />}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading chapters…</p>
      ) : total === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Film className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium">No chapter videos yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Generate one avatar video per course section — they render in the background.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {chapters.map((ch: any, i: number) => {
            const s = STATUS[ch.status as string] || STATUS.queued;
            const Icon = s.icon;
            return (
              <div key={ch.id} className="rounded-lg border bg-background/50 overflow-hidden" data-testid={`chapter-${ch.chapter_order}`}>
                <div className="flex items-center justify-between gap-2 p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-muted text-xs font-semibold flex items-center justify-center">{(ch.chapter_order ?? i) + 1}</span>
                    <span className="text-sm font-medium truncate">{ch.title || `Chapter ${i + 1}`}</span>
                  </div>
                  <Badge variant="outline" className={cn('text-xs gap-1 shrink-0', s.cls)}>
                    <Icon className={cn('h-3 w-3', ch.status === 'generating' && 'animate-spin')} />{s.label}
                  </Badge>
                </div>
                {ch.status === 'ready' && ch.video_url && (
                  <video controls preload="metadata" src={ch.video_url} className="w-full bg-black aspect-video" data-testid={`chapter-video-${ch.chapter_order}`} />
                )}
                {(ch.status === 'generating' || ch.status === 'queued') && (
                  <div className="px-2.5 pb-2.5">
                    <div className="rounded-md bg-muted/40 h-24 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />Video generating…
                    </div>
                  </div>
                )}
                {ch.status === 'failed' && (
                  <div className="px-2.5 pb-2.5 text-xs text-destructive">{ch.error_message || 'Generation failed'}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
