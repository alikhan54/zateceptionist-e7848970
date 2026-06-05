import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Briefcase, MapPin, Calendar, Send, Eye, Archive, ExternalLink,
  ChevronRight, Sparkles, CheckCircle2, AlertTriangle, Star, ArchiveRestore,
} from "lucide-react";
import type { JobApplication, JobRequisition } from "@/hooks/useRecruitment";

// Headline score: prefer the Claude screening score (richest), then the match score (both 0-100).
const scoreOf = (a: JobApplication): number | null =>
  a.ai_screening_score ?? a.ai_match_score ?? null;

// Band: >=75 strong (green) / 40-74 review (amber) / <40 out (grey).
function band(s: number | null) {
  if (s == null) return { stroke: "#64748b", text: "text-muted-foreground", label: "unscored" };
  if (s >= 75) return { stroke: "#22c55e", text: "text-chart-2", label: "strong" };
  if (s >= 40) return { stroke: "#f59e0b", text: "text-chart-4", label: "review" };
  return { stroke: "#64748b", text: "text-muted-foreground", label: "screened out" };
}

function ScoreRing({ score, size = 72 }: { score: number | null; size?: number }) {
  const b = band(score);
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const off = circ - (pct / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={6} fill="none" />
        {score != null && (
          <circle cx={size / 2} cy={size / 2} r={r} stroke={b.stroke} strokeWidth={6} fill="none"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold leading-none", b.text)} style={{ fontSize: size * 0.27 }}>
          {score != null ? `${Math.round(score)}%` : "—"}
        </span>
        <span className="text-[8px] uppercase tracking-wide text-muted-foreground mt-0.5">match</span>
      </div>
    </div>
  );
}

const stageBadge: Record<string, string> = {
  phone_screen: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  interview: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  technical: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  final: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  offer: "bg-primary/10 text-primary border-primary/30",
  hired: "bg-chart-1/10 text-chart-1 border-chart-1/30",
  screening: "bg-chart-4/10 text-chart-4 border-chart-4/30",
  applied: "bg-muted text-muted-foreground border-border",
  rejected: "bg-muted text-muted-foreground border-border",
};
const stageText: Record<string, string> = {
  phone_screen: "phone screen", screening: "screening · review", applied: "applied",
  interview: "interview", technical: "technical", final: "final", offer: "offer",
  hired: "hired", rejected: "screened out",
};

export interface CandidateBoardProps {
  applications: JobApplication[];
  jobs: JobRequisition[];
  onView: (app: JobApplication) => void;
  onContact: (app: JobApplication) => void;
  onArchive: (app: JobApplication) => void;
}

export function CandidateBoard({ applications, jobs, onView, onContact, onArchive }: CandidateBoardProps) {
  const [showRejected, setShowRejected] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({});
  const [whyApp, setWhyApp] = useState<JobApplication | null>(null);

  const jobsById = useMemo(() => {
    const m = new Map<string, JobRequisition>();
    for (const j of jobs) m.set(j.id, j);
    return m;
  }, [jobs]);

  // group applications by opening, sort each by score desc
  const groups = useMemo(() => {
    const m = new Map<string, JobApplication[]>();
    for (const a of applications) {
      const k = a.job_requisition_id || "unassigned";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    const out = Array.from(m.entries()).map(([jid, apps]) => {
      apps.sort((x, y) => (scoreOf(y) ?? -1) - (scoreOf(x) ?? -1));
      const job = jobsById.get(jid);
      return { jid, job, apps };
    });
    // openings with the most candidates first, then by newest posting
    out.sort((a, b) => b.apps.length - a.apps.length);
    return out;
  }, [applications, jobsById]);

  if (applications.length === 0) {
    return (
      <div className="text-center py-16">
        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">No candidates yet</h3>
        <p className="text-muted-foreground">Post a job — your AI will source, rank, and explain candidates here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {groups.map(({ jid, job, apps }) => {
        const title = job?.job_title || apps[0]?.requisition?.job_title || (jid === "unassigned" ? "Unassigned" : "Opening");
        const loc = job?.location_city || apps[0]?.requisition?.location_city;
        const posted = job?.created_at || apps[0]?.requisition?.created_at;
        const status = job?.status || apps[0]?.requisition?.status;
        const archived = apps.filter((a) => a.candidate?.status === "archived");
        const live = apps.filter((a) => a.candidate?.status !== "archived");
        const active = live.filter((a) => a.stage !== "rejected");
        const rejected = live.filter((a) => a.stage === "rejected");
        const advanced = active.filter((a) => (scoreOf(a) ?? 0) >= 75).length;

        return (
          <div key={jid} className="rounded-xl border bg-card overflow-hidden">
            {/* opening header */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">{title}</h3>
                  {status && <Badge variant="outline" className="text-[10px] uppercase">{status}</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {loc && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{loc}</span>}
                  {posted && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Posted {new Date(posted).toLocaleDateString()}</span>}
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />{apps.length} ranked by AI</span>
                </div>
              </div>
              {advanced > 0 && (
                <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30 gap-1">
                  <Star className="h-3 w-3" />{advanced} strong match{advanced > 1 ? "es" : ""}
                </Badge>
              )}
            </div>

            {/* ranked candidates */}
            <div className="divide-y">
              {active.map((app) => <CandRow key={app.id} app={app} onView={onView} onContact={onContact} onArchive={onArchive} onWhy={setWhyApp} />)}
              {active.length === 0 && (
                <div className="px-5 py-6 text-sm text-muted-foreground">No active candidates for this opening.</div>
              )}
            </div>

            {/* rejected drawer */}
            {rejected.length > 0 && (
              <div className="border-t bg-muted/20">
                <button className="w-full flex items-center justify-between px-5 py-3 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowRejected((s) => ({ ...s, [jid]: !s[jid] }))}>
                  <span className="inline-flex items-center gap-2">
                    <ChevronRight className={cn("h-4 w-4 transition-transform", showRejected[jid] && "rotate-90")} />
                    Screened out by AI ({rejected.length}) — off-target / thin profile
                  </span>
                  <span className="text-xs">{showRejected[jid] ? "hide" : "show"}</span>
                </button>
                {showRejected[jid] && <div className="divide-y">{rejected.map((app) => <CandRow key={app.id} app={app} dim onView={onView} onContact={onContact} onArchive={onArchive} onWhy={setWhyApp} />)}</div>}
              </div>
            )}

            {/* archived drawer */}
            {archived.length > 0 && (
              <div className="border-t bg-muted/20">
                <button className="w-full flex items-center justify-between px-5 py-3 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowArchived((s) => ({ ...s, [jid]: !s[jid] }))}>
                  <span className="inline-flex items-center gap-2">
                    <Archive className="h-4 w-4" />Archived ({archived.length}) — recoverable
                  </span>
                  <span className="text-xs">{showArchived[jid] ? "hide" : "show"}</span>
                </button>
                {showArchived[jid] && <div className="divide-y">{archived.map((app) => <CandRow key={app.id} app={app} dim archived onView={onView} onContact={onContact} onArchive={onArchive} onWhy={setWhyApp} />)}</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* full "why" dialog */}
      <Dialog open={!!whyApp} onOpenChange={(o) => !o && setWhyApp(null)}>
        <DialogContent className="max-w-lg">
          {whyApp && <WhyDetail app={whyApp} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CandRow({ app, dim, archived, onView, onContact, onArchive, onWhy }: {
  app: JobApplication; dim?: boolean; archived?: boolean;
  onView: (a: JobApplication) => void; onContact: (a: JobApplication) => void;
  onArchive: (a: JobApplication) => void; onWhy: (a: JobApplication) => void;
}) {
  const c = app.candidate;
  const name = c?.full_name || `${c?.first_name || ""} ${c?.last_name || ""}`.trim() || "Candidate";
  const title = c?.current_title || c?.current_position || "—";
  const s = scoreOf(app);
  const r = app.ai_screening_result || {};
  const skillsN = c?.skills?.length;
  const exp = c?.total_experience_years ?? c?.experience_years ?? null;
  const top = (r.strengths && r.strengths[0]) || app.ai_assessment_summary || null;

  return (
    <div className={cn("flex items-center gap-4 px-5 py-4", dim && "opacity-60")}>
      <ScoreRing score={s} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{name}</h4>
          <Badge variant="outline" className={cn("text-[10px] capitalize", stageBadge[app.stage] || stageBadge.applied)}>
            {stageText[app.stage] || app.stage}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {r.skill_match_pct != null && <Chip ok>{Math.round(Number(r.skill_match_pct))}% skill match</Chip>}
          {exp != null && <Chip ok={r.experience_match === "yes"}>{exp} yr{r.experience_match === "yes" ? " · exceeds" : ""}</Chip>}
          {skillsN ? <Chip>{skillsN} skills</Chip> : null}
          {r.location_match && <Chip>{r.location_match}</Chip>}
        </div>
        {top && (
          <button onClick={() => onWhy(app)} className="group mt-2 flex items-start gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground">
            <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <span className="line-clamp-1"><span className="text-foreground font-medium">Why {s != null ? Math.round(s) : "—"}:</span> {top}</span>
            <span className="text-primary group-hover:underline shrink-0">details</span>
          </button>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex gap-1.5">
          {archived ? (
            <Button size="sm" variant="outline" onClick={() => onArchive(app)}><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Restore</Button>
          ) : (
            <>
              {(c?.email || c?.phone || c?.linkedin_url) && <Button size="sm" onClick={() => onContact(app)}><Send className="h-3.5 w-3.5 mr-1" />Contact</Button>}
              <Button size="sm" variant="outline" onClick={() => onView(app)}><Eye className="h-3.5 w-3.5 mr-1" />View</Button>
            </>
          )}
        </div>
        {!archived && (
          <button onClick={() => onArchive(app)} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Archive className="h-3 w-3" />archive
          </button>
        )}
        {c?.linkedin_url && (
          <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

function Chip({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span className={cn("text-[11px] px-2 py-0.5 rounded-md border",
      ok ? "bg-chart-2/10 text-chart-2 border-chart-2/30" : "bg-muted/50 text-muted-foreground border-border")}>
      {children}
    </span>
  );
}

function WhyDetail({ app }: { app: JobApplication }) {
  const c = app.candidate;
  const name = c?.full_name || `${c?.first_name || ""} ${c?.last_name || ""}`.trim();
  const s = scoreOf(app);
  const r = app.ai_screening_result || {};
  const b = band(s);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <ScoreRing score={s} size={56} />
          <div>
            <div>{name}</div>
            <div className="text-xs font-normal text-muted-foreground">{c?.current_title || c?.current_position}</div>
          </div>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {r.skill_match_pct != null && <Chip ok>{Math.round(Number(r.skill_match_pct))}% skill match</Chip>}
          {r.experience_match && <Chip ok={r.experience_match === "yes"}>experience: {r.experience_match}</Chip>}
          {r.location_match && <Chip>location: {r.location_match}</Chip>}
          {r.recommended_action && <Chip>AI: {r.recommended_action}</Chip>}
        </div>
        {r.reasoning && (
          <p className="text-muted-foreground leading-relaxed">{r.reasoning}</p>
        )}
        {r.strengths && r.strengths.length > 0 && (
          <div>
            <p className="font-medium mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-chart-2" />Strengths</p>
            <ul className="space-y-1">{r.strengths.map((x, i) => <li key={i} className="text-muted-foreground flex gap-2"><span className="text-chart-2">·</span>{x}</li>)}</ul>
          </div>
        )}
        {r.red_flags && r.red_flags.length > 0 && (
          <div>
            <p className="font-medium mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-chart-4" />Watch-outs</p>
            <ul className="space-y-1">{r.red_flags.map((x, i) => <li key={i} className="text-muted-foreground flex gap-2"><span className="text-chart-4">·</span>{x}</li>)}</ul>
          </div>
        )}
        {!r.reasoning && (
          <p className="text-muted-foreground">This candidate hasn't been AI-screened yet. The score shown is the sourcing match.</p>
        )}
      </div>
    </>
  );
}
