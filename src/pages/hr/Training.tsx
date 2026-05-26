import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { AskAIButton } from '@/components/hr/AskAIButton';
import { useTraining } from '@/hooks/useHR';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import { CircularProgress } from '@/components/hr/CircularProgress';
import {
  GraduationCap, BookOpen, Clock, Users, Award, Play,
  CheckCircle2, Search, Calendar, TrendingUp, Sparkles, Trophy, Plus,
  MoreVertical, RotateCcw, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function TrainingPage() {
  const { tenantConfig } = useTenant();
  const queryClient = useQueryClient();
  const { programs, enrollments, enroll, createProgram } = useTraining();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', description: '', duration_hours: '', max_participants: '' });
  // Course player state — opened by Continue button on an enrolled course
  const [playerRecord, setPlayerRecord] = useState<any | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const invalidateEnrollments = () => queryClient.invalidateQueries({ queryKey: ['training-enrollments', tenantConfig?.id] });

  const openPlayer = (record: any) => {
    setPlayerRecord(record);
    setPlayerOpen(true);
    setQuizOpen(false);
    setQuizScore(null);
    setQuizAnswers({});
  };

  const handleUnenroll = async (recordId: string) => {
    if (!window.confirm('Unenroll from this course? Your progress will be lost.')) return;
    const { error } = await supabase.from('hr_training_records').delete().eq('id', recordId);
    if (error) { toast.error(`Failed to unenroll: ${error.message}`); return; }
    toast.success('Unenrolled');
    invalidateEnrollments();
  };
  const handleRestart = async (recordId: string) => {
    const { error } = await supabase.from('hr_training_records').update({
      status: 'enrolled', progress: 0, completion_date: null, start_date: new Date().toISOString().slice(0, 10),
    }).eq('id', recordId);
    if (error) { toast.error(`Failed to restart: ${error.message}`); return; }
    toast.success('Course restarted');
    invalidateEnrollments();
  };
  const handleMarkComplete = async (recordId: string) => {
    const { error } = await supabase.from('hr_training_records').update({
      status: 'completed', progress: 100, completion_date: new Date().toISOString().slice(0, 10),
    }).eq('id', recordId);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    toast.success('Marked complete');
    invalidateEnrollments();
  };

  const handleCreateProgram = () => {
    if (!newProgram.name.trim()) return;
    createProgram.mutate({
      name: newProgram.name.trim(),
      description: newProgram.description || undefined,
      duration_hours: newProgram.duration_hours ? Number(newProgram.duration_hours) : undefined,
      max_participants: newProgram.max_participants ? Number(newProgram.max_participants) : undefined,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setNewProgram({ name: '', description: '', duration_hours: '', max_participants: '' });
      },
    });
  };

  // Some programs (AI-generated) store the full structured content in
  // description as a JSON blob. Detect and unwrap so the card renders the
  // human-readable lesson summary instead of `{"ai_generated":true,...}`.
  const displayPrograms = (programs.data || []).map((p: any) => {
    const desc = p.description || '';
    if (typeof desc === 'string' && desc.trim().startsWith('{') && desc.includes('content_script')) {
      try {
        const meta = JSON.parse(desc);
        const summary = (meta.content_script || '').slice(0, 200).trim();
        return {
          ...p,
          title: p.name || p.title,
          description_display: summary || meta.summary || '',
          ai_meta: meta,
        };
      } catch { /* fall through */ }
    }
    return { ...p, title: p.name || p.title, description_display: desc };
  });
  // hr_training_records does not have program_id, so join to hr_training_programs
  // by training_name (the denormalized link). Pull the AI content blob from
  // program.provider (where the generator workflow stores it) so the Continue
  // player has slides/questions/avatar_video_url.
  const enrolledRaw = enrollments.data || [];
  const programByName = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of (programs.data || []) as any[]) {
      if (!p?.name) continue;
      let meta: any = {};
      try { meta = JSON.parse(p.provider || '{}'); } catch {}
      m.set(String(p.name).toLowerCase(), { ...p, ai: meta });
    }
    return m;
  }, [programs.data]);
  const displayEnrollments = (enrolledRaw as any[]).map((r) => {
    const prog = r.training_name ? programByName.get(String(r.training_name).toLowerCase()) : null;
    return {
      ...r,
      title: r.training_name || r.program_title || prog?.name || 'Untitled course',
      enrolled_at: r.start_date || r.enrolled_at || null,
      program: prog || null,
    };
  });
  const categories = ['all', 'Leadership', 'Technical', 'Management', 'Soft Skills'];

  const getFormatBadge = (fmt: string) => {
    const styles: Record<string, string> = {
      online: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
      classroom: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
      hybrid: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    };
    return <Badge variant="outline" className={styles[fmt] || styles.online}>{fmt}</Badge>;
  };

  const filteredPrograms = displayPrograms.filter(p => {
    const programName = (p as any).name || p.title || '';
    const programDesc = (p as any).description_display || p.description || '';
    const matchesSearch = programName.toLowerCase().includes(searchQuery.toLowerCase()) || programDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Learning Hub
          </h1>
          <p className="text-muted-foreground mt-1">Develop skills and advance your career</p>
        </div>
        <div className="flex items-center gap-2">
          <AskAIButton message="Recommend training programs based on performance gaps and skill requirements" label="AI Training Plan" />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Training Program</DialogTitle>
                <DialogDescription>Add a new training program to the catalogue.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. Leadership Essentials"
                    value={newProgram.name}
                    onChange={e => setNewProgram({ ...newProgram, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What participants will learn"
                    value={newProgram.description}
                    onChange={e => setNewProgram({ ...newProgram, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      placeholder="8"
                      value={newProgram.duration_hours}
                      onChange={e => setNewProgram({ ...newProgram, duration_hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Participants</Label>
                    <Input
                      type="number"
                      placeholder="20"
                      value={newProgram.max_participants}
                      onChange={e => setNewProgram({ ...newProgram, max_participants: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateProgram} disabled={createProgram.isPending || !newProgram.name.trim()}>
                  {createProgram.isPending ? 'Creating…' : 'Create Program'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Courses', value: displayPrograms.length, icon: BookOpen, color: 'primary' },
          { label: 'In Progress', value: displayEnrollments.filter(e => e.status === 'in_progress').length, icon: Play, color: 'chart-3' },
          { label: 'Completed', value: displayEnrollments.filter(e => e.status === 'completed').length, icon: CheckCircle2, color: 'chart-2' },
          { label: 'Certifications', value: displayEnrollments.filter(e => e.certificate_url).length, icon: Trophy, color: 'chart-4' },
        ].map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold"><AnimatedNumber value={stat.value} /></p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog" className="gap-2"><BookOpen className="h-4 w-4" />Course Catalog</TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-2"><Play className="h-4 w-4" />My Learning</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><Calendar className="h-4 w-4" />Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search courses..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {programs.isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>)}
            </div>
          ) : filteredPrograms.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrograms.map((program) => (
                <Card key={program.id} className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
                  {/* Course card header */}
                  <div className="h-36 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center relative">
                    <GraduationCap className="h-14 w-14 text-primary/40 group-hover:scale-110 transition-transform" />
                    {/* Category badge */}
                    <Badge variant="secondary" className="absolute top-3 left-3 rounded-full">{program.category}</Badge>
                    {/* Duration pill */}
                    <Badge className="absolute top-3 right-3 bg-background/80 text-foreground backdrop-blur-sm rounded-full">
                      <Clock className="h-3 w-3 mr-1" />{program.duration_hours}h
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{(program as any).title || (program as any).name || 'Untitled'}</h3>
                      {getFormatBadge(program.format)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{(program as any).description_display || program.description || ''}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{program.enrolled_count} enrolled</span>
                      {program.provider && <span className="truncate">{program.provider}</span>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium">{program.completion_rate}%</span>
                      </div>
                      <Progress value={program.completion_rate} className="h-1.5" />
                    </div>
                    <Button className="w-full" onClick={() => enroll.mutate({ program_id: program.id })} disabled={enroll.isPending}>
                      Enroll Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="font-medium text-muted-foreground">No training programs available</p>
                <p className="text-sm text-muted-foreground mt-1">Training programs will appear here when configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader><CardTitle>My Learning Journey</CardTitle><CardDescription>Continue your enrolled courses</CardDescription></CardHeader>
            <CardContent>
              {displayEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {displayEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="p-4 border rounded-xl hover:shadow-md transition-all flex items-center gap-4" data-testid={`enrollment-row-${enrollment.id}`}>
                      <CircularProgress value={enrollment.progress || 0} size={56} strokeWidth={4}>
                        <span className="text-xs font-bold">{enrollment.progress || 0}%</span>
                      </CircularProgress>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{enrollment.title}</h4>
                          {enrollment.status === 'completed' && enrollment.certificate_url && (
                            <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">
                              <Trophy className="h-3 w-3 mr-1" />Certified
                            </Badge>
                          )}
                          {enrollment.program?.ai?.ai_generated && (
                            <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.program?.type ? `${enrollment.program.type} · ` : ''}
                          {enrollment.program?.duration_hours ? `${enrollment.program.duration_hours}h · ` : ''}
                          Enrolled: {enrollment.enrolled_at || '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className={enrollment.status === 'completed' ? 'bg-chart-2/10 text-chart-2' : 'bg-chart-3/10 text-chart-3'}>
                        {enrollment.status === 'completed' ? <><CheckCircle2 className="h-3 w-3 mr-1" />Completed</> : <><Play className="h-3 w-3 mr-1" />{enrollment.status === 'enrolled' ? 'Not started' : 'In Progress'}</>}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => openPlayer(enrollment)} data-testid={`enrollment-continue-${enrollment.id}`}>
                        {enrollment.status === 'completed' ? 'Review' : 'Continue'}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`enrollment-menu-${enrollment.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRestart(enrollment.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />Restart course
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkComplete(enrollment.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />Mark complete
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUnenroll(enrollment.id)} className="text-destructive">
                            <X className="h-4 w-4 mr-2" />Unenroll
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No courses enrolled yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Browse the catalog to find courses</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader><CardTitle>Training Schedule</CardTitle><CardDescription>Upcoming training sessions and deadlines</CardDescription></CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="font-medium text-muted-foreground">No upcoming sessions</p>
                <p className="text-sm text-muted-foreground mt-1">Scheduled training will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Course Player Dialog — opens on Continue/Review */}
      <Dialog open={playerOpen} onOpenChange={(o) => { setPlayerOpen(o); if (!o) { setQuizOpen(false); setQuizScore(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{playerRecord?.title || 'Course'}</DialogTitle>
            <DialogDescription>
              {playerRecord?.program?.type || 'online'}
              {playerRecord?.program?.duration_hours ? ` · ${playerRecord.program.duration_hours}h` : ''}
              {playerRecord?.program?.ai?.category ? ` · ${playerRecord.program.ai.category}` : ''}
            </DialogDescription>
          </DialogHeader>
          {!quizOpen ? (
            <div className="space-y-4">
              {playerRecord?.program?.ai?.avatar_video_url && (
                <video controls src={playerRecord.program.ai.avatar_video_url} className="w-full rounded" data-testid="course-avatar-video" />
              )}
              {Array.isArray(playerRecord?.program?.ai?.learning_objectives) && playerRecord.program.ai.learning_objectives.length > 0 && (
                <div className="rounded border p-3 bg-muted/40">
                  <h4 className="font-semibold mb-2 text-sm">Learning objectives</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {playerRecord.program.ai.learning_objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(playerRecord?.program?.ai?.slides) && playerRecord.program.ai.slides.length > 0 ? (
                <div className="space-y-3">
                  {playerRecord.program.ai.slides.map((slide: any, i: number) => (
                    <div key={i} className="border rounded p-4">
                      <h3 className="font-semibold mb-2">{i + 1}. {slide.title}</h3>
                      <p className="text-sm whitespace-pre-wrap">{slide.content}</p>
                    </div>
                  ))}
                </div>
              ) : playerRecord?.program?.ai?.content_script ? (
                <div className="border rounded p-4 bg-muted/20 text-sm whitespace-pre-wrap">
                  {playerRecord.program.ai.content_script}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No AI-generated content available for this course yet.</p>
              )}
            </div>
          ) : quizScore === null ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Passing score: {playerRecord?.program?.ai?.passing_score ?? 70}%. Pick the best answer for each.
              </p>
              {(playerRecord?.program?.ai?.questions || []).map((q: any, qi: number) => (
                <div key={qi} className="border rounded p-3">
                  <p className="font-medium mb-2">{qi + 1}. {q.question}</p>
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt: string, oi: number) => (
                      <label key={oi} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name={`q${qi}`}
                          value={oi}
                          checked={quizAnswers[qi] === oi}
                          onChange={() => setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                          data-testid={`quiz-q${qi}-opt${oi}`}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-center py-6">
              <div className="text-5xl font-bold">{quizScore}%</div>
              <p className="text-sm text-muted-foreground">
                {quizScore >= (playerRecord?.program?.ai?.passing_score ?? 70)
                  ? 'Congratulations — you passed!'
                  : `You need ${playerRecord?.program?.ai?.passing_score ?? 70}% to pass. Try again.`}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {!quizOpen && (playerRecord?.program?.ai?.questions || []).length > 0 && (
              <Button onClick={() => { setQuizOpen(true); setQuizScore(null); setQuizAnswers({}); }} data-testid="course-take-quiz">
                Take Assessment ({playerRecord.program.ai.questions.length} questions)
              </Button>
            )}
            {quizOpen && quizScore === null && (
              <Button
                disabled={quizSubmitting || Object.keys(quizAnswers).length < (playerRecord?.program?.ai?.questions?.length || 0)}
                onClick={async () => {
                  if (!playerRecord) return;
                  setQuizSubmitting(true);
                  const qs = playerRecord.program?.ai?.questions || [];
                  let correct = 0;
                  qs.forEach((q: any, i: number) => { if (quizAnswers[i] === q.correct_answer) correct++; });
                  const pct = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
                  setQuizScore(pct);
                  const pass = pct >= (playerRecord.program?.ai?.passing_score ?? 70);
                  const { error } = await supabase.from('hr_training_records').update({
                    status: pass ? 'completed' : 'enrolled',
                    progress: pct,
                    score: pct,
                    completion_date: pass ? new Date().toISOString().slice(0, 10) : null,
                  }).eq('id', playerRecord.id);
                  if (!error) {
                    toast.success(pass ? `Passed with ${pct}%` : `Score: ${pct}%`);
                    invalidateEnrollments();
                  }
                  setQuizSubmitting(false);
                }}
                data-testid="course-submit-quiz"
              >
                {quizSubmitting ? 'Submitting…' : 'Submit answers'}
              </Button>
            )}
            {quizScore !== null && (
              <Button variant="outline" onClick={() => { setQuizOpen(false); setQuizScore(null); setQuizAnswers({}); }}>
                Back to course
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPlayerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
