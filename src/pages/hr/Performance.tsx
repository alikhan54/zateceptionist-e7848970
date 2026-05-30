import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { AskAIButton } from '@/components/hr/AskAIButton';
import { usePerformance, useEmployees, useCurrentEmployee } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CircularProgress } from '@/components/hr/CircularProgress';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import {
  TrendingUp, Target, Star, Users, ClipboardCheck, Award,
  MessageSquare, Plus, Clock, AlertTriangle, Pencil, CalendarDays
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function PerformancePage() {
  const { t } = useTenant();
  const { data, isLoading, createReview, createGoal, aiGenerateReview, createFeedback, updateReview } = usePerformance();
  const { data: employees } = useEmployees();
  const { data: currentEmployee } = useCurrentEmployee();
  const employeeList = employees || [];
  const myEmpId = currentEmployee?.id;

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [newReview, setNewReview] = useState({ employee_id: '', employee_name: '', review_type: 'quarterly', review_period_start: '', review_period_end: '' });
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: 'performance', target_date: '' });
  // V6: 360° feedback dialog
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'give' | 'request'>('give');
  const [feedbackForm, setFeedbackForm] = useState({ employee_id: '', comments: '' });
  // V7: edit review dialog
  const [editReview, setEditReview] = useState<any>(null);
  const [editReviewForm, setEditReviewForm] = useState({ comments: '', overall_rating: '', status: 'in_progress' });

  const reviews = data?.reviews || [];
  const goals = data?.goals || [];
  // My Reviews = rows where the signed-in user is the reviewee (employee_id === my employee id).
  const myReviews = myEmpId ? reviews.filter((r: any) => r.employee_id === myEmpId) : [];

  // Real status set (DB CHECK): pending / in_progress / submitted / acknowledged.
  const STATUS_META: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'In progress', cls: 'bg-chart-3/10 text-chart-3 border-chart-3/20' },
    submitted: { label: 'Submitted', cls: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
    acknowledged: { label: 'Acknowledged', cls: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
  };
  const getStatusBadge = (status: string) => {
    const m = STATUS_META[status] || { label: status || 'unknown', cls: 'bg-muted text-muted-foreground' };
    return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
  };
  const reviewTypeLabel = (rt?: string) =>
    (({ manager: 'Manager review', self: 'Self-assessment', peer: 'Peer feedback', '360': '360° feedback' } as Record<string, string>)[rt || ''] || rt || 'Review');
  const openEditReview = (r: any) => {
    setEditReview(r);
    setEditReviewForm({ comments: r.comments || '', overall_rating: r.overall_rating != null ? String(r.overall_rating) : '', status: r.status || 'in_progress' });
  };
  const saveEditReview = () => {
    if (!editReview) return;
    updateReview.mutate({
      id: editReview.id,
      comments: editReviewForm.comments || undefined,
      overall_rating: editReviewForm.overall_rating ? Number(editReviewForm.overall_rating) : null,
      status: editReviewForm.status || undefined,
    }, { onSuccess: () => setEditReview(null) });
  };

  const getRatingStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-chart-4 fill-chart-4' : 'text-muted'}`} />
      ))}
    </div>
  );

  // Shared review row — always shows WHO the review is for, the type, the date,
  // rating + status, and an Edit affordance. Used by My Reviews and Team Reviews.
  const renderReviewRow = (review: any) => (
    <div key={review.id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all group gap-3">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar className="ring-2 ring-background">
          <AvatarFallback className="bg-primary/10 text-primary">{(review.employee_name || 'E').charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold truncate">{review.employee_name || 'Unknown employee'}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <span>{reviewTypeLabel(review.review_type)}</span>
            {review.reviewed_on && <><span>·</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{review.reviewed_on}</span></>}
          </p>
          {review.comments && <p className="text-sm text-muted-foreground/80 line-clamp-1 mt-0.5">{review.comments}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {review.overall_rating ? getRatingStars(review.overall_rating) : null}
        {getStatusBadge(review.status)}
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditReview(review)} aria-label="Edit review">
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / reviews.filter(r => r.overall_rating).length).toFixed(1)
    : '0';

  const getDueInfo = (targetDate?: string) => {
    if (!targetDate) return null;
    try {
      const days = differenceInDays(parseISO(targetDate), new Date());
      if (days < 0) return <Badge variant="destructive" className="text-xs">Overdue by {Math.abs(days)}d</Badge>;
      if (days <= 7) return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs" variant="outline">{days}d left</Badge>;
      return <Badge variant="secondary" className="text-xs">{days}d left</Badge>;
    } catch { return null; }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-muted-foreground mt-1">Track goals, reviews, and {t('staff').toLowerCase()} development</p>
        </div>
        <div className="flex items-center gap-2">
          <AskAIButton message="Analyze performance trends, identify top performers and improvement areas" label="AI Performance Insights" />
          <Button className="gap-2" onClick={() => setIsReviewOpen(true)}><Plus className="h-4 w-4" />Create Review</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Goals', value: goals.filter(g => g.status !== 'completed' && g.status !== 'cancelled').length, icon: Target, color: 'primary' },
          { label: 'Pending Reviews', value: reviews.filter(r => r.status !== 'completed').length, icon: ClipboardCheck, color: 'chart-2' },
          { label: 'Avg Rating', value: Number(avgRating), icon: Star, color: 'chart-4', suffix: '/5' },
          { label: 'Top Performers', value: reviews.filter(r => (r.overall_rating || 0) >= 4).length, icon: Award, color: 'chart-3' },
        ].map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stat.suffix ? avgRating : <AnimatedNumber value={stat.value} />}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals" className="gap-2"><Target className="h-4 w-4" />Goals & OKRs</TabsTrigger>
          <TabsTrigger value="my-reviews" className="gap-2"><ClipboardCheck className="h-4 w-4" />My Reviews</TabsTrigger>
          <TabsTrigger value="team-reviews" className="gap-2"><Users className="h-4 w-4" />Team Reviews</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2"><MessageSquare className="h-4 w-4" />360° Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Goals & Objectives</CardTitle><CardDescription>Track progress on your key objectives</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsGoalOpen(true)}><Plus className="h-4 w-4" />Add Goal</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
              ) : goals.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="p-4 border rounded-xl hover:shadow-md transition-all group">
                      <div className="flex items-start gap-4">
                        <CircularProgress value={goal.progress_percent} size={64} strokeWidth={5}>
                          <span className="text-sm font-bold">{goal.progress_percent}%</span>
                        </CircularProgress>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold truncate">{goal.title}</h4>
                            <Badge variant="outline" className={goal.status === 'completed' ? 'bg-chart-2/10 text-chart-2' : 'bg-chart-3/10 text-chart-3'}>
                              {goal.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {getDueInfo(goal.target_date)}
                            {goal.target_date && <span className="text-xs text-muted-foreground">Target: {goal.target_date}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No goals set yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Goal" to create your first objective</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => setIsGoalOpen(true)}><Plus className="h-4 w-4" />Add Your First Goal</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-reviews">
          <Card>
            <CardHeader><CardTitle>My Performance Reviews</CardTitle><CardDescription>Reviews and feedback about you</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : !myEmpId ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">We couldn't match your login to an employee record</p>
                  <p className="text-sm text-muted-foreground">Ask HR to set your work email on your employee profile to see your reviews.</p>
                </div>
              ) : myReviews.length > 0 ? (
                <div className="space-y-3">{myReviews.map(renderReviewRow)}</div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No reviews about you yet</p>
                  <p className="text-sm text-muted-foreground">Reviews appear here once a manager or peer submits one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-reviews">
          <Card>
            <CardHeader><CardTitle>Team Performance Reviews</CardTitle><CardDescription>Reviews for your direct reports</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map(renderReviewRow)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No team reviews available</p>
                  <p className="text-sm text-muted-foreground">Reviews will appear when a cycle starts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader><CardTitle>360° Feedback</CardTitle><CardDescription>Collect and provide peer feedback</CardDescription></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-muted/50 rounded-xl text-center hover:bg-muted transition-colors cursor-pointer group">
                  <MessageSquare className="h-10 w-10 mx-auto text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-2">Give Feedback</h4>
                  <p className="text-sm text-muted-foreground mb-4">Provide constructive feedback to your colleagues</p>
                  <Button variant="outline" onClick={() => { setFeedbackMode('give'); setFeedbackForm({ employee_id: '', comments: '' }); setFeedbackOpen(true); }}>Start Feedback</Button>
                </div>
                <div className="p-6 bg-muted/50 rounded-xl text-center hover:bg-muted transition-colors cursor-pointer group">
                  <Star className="h-10 w-10 mx-auto text-chart-4 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-2">Request Feedback</h4>
                  <p className="text-sm text-muted-foreground mb-4">Ask colleagues for feedback on your performance</p>
                  <Button variant="outline" onClick={() => { setFeedbackMode('request'); setFeedbackForm({ employee_id: '', comments: '' }); setFeedbackOpen(true); }}>Request Feedback</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Performance Review</DialogTitle>
            <DialogDescription>Start a new performance review cycle for a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newReview.employee_id} onValueChange={(v) => {
                const emp = employeeList.find(e => e.id === v);
                setNewReview({ ...newReview, employee_id: v, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employeeList.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Review Type</Label>
              <Select value={newReview.review_type} onValueChange={(v) => setNewReview({ ...newReview, review_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="project">Project-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={newReview.review_period_start} onChange={(e) => setNewReview({ ...newReview, review_period_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={newReview.review_period_end} onChange={(e) => setNewReview({ ...newReview, review_period_end: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              disabled={!newReview.employee_id || aiGenerateReview.isPending}
              onClick={async () => {
                await aiGenerateReview.mutateAsync({ employee_id: newReview.employee_id, review_type: newReview.review_type });
                setIsReviewOpen(false);
                setNewReview({ employee_id: '', employee_name: '', review_type: 'quarterly', review_period_start: '', review_period_end: '' });
              }}
              data-testid="ai-generate-review-btn"
            >
              {aiGenerateReview.isPending ? 'AI Generating…' : 'AI Generate'}
            </Button>
            <Button disabled={!newReview.employee_id || createReview.isPending} onClick={() => {
              createReview.mutate(newReview);
              setIsReviewOpen(false);
              setNewReview({ employee_id: '', employee_name: '', review_type: 'quarterly', review_period_start: '', review_period_end: '' });
            }}>{createReview.isPending ? 'Creating…' : 'Create Review'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
            <DialogDescription>Set a new objective to track progress</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input placeholder="e.g. Increase team velocity by 20%" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Describe the objective" value={newGoal.description} onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newGoal.category} onValueChange={(v) => setNewGoal({ ...newGoal, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input type="date" value={newGoal.target_date} onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalOpen(false)}>Cancel</Button>
            <Button disabled={!newGoal.title} onClick={() => {
              createGoal.mutate(newGoal);
              setIsGoalOpen(false);
              setNewGoal({ title: '', description: '', category: 'performance', target_date: '' });
            }}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V6: 360° feedback dialog (Give / Request) */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{feedbackMode === 'give' ? 'Give Feedback' : 'Request Feedback'}</DialogTitle>
            <DialogDescription>
              {feedbackMode === 'give'
                ? 'Provide 360° feedback to a colleague — recorded in their review history.'
                : 'Request 360° feedback about a colleague (creates a pending feedback item).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{feedbackMode === 'give' ? 'Colleague' : 'About'}</Label>
              <Select value={feedbackForm.employee_id} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select colleague" /></SelectTrigger>
                <SelectContent>{employeeList.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{feedbackMode === 'give' ? 'Feedback' : 'Message (optional)'}</Label>
              <Input placeholder={feedbackMode === 'give' ? 'Strengths, areas to improve, examples…' : 'What feedback are you requesting?'} value={feedbackForm.comments} onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button
              disabled={!feedbackForm.employee_id || (feedbackMode === 'give' && !feedbackForm.comments.trim()) || createFeedback.isPending}
              onClick={() => {
                createFeedback.mutate({
                  employee_id: feedbackForm.employee_id,
                  comments: feedbackForm.comments.trim() || 'Feedback requested',
                  feedback_type: '360',
                  status: feedbackMode === 'request' ? 'pending' : 'submitted',
                }, { onSuccess: () => setFeedbackOpen(false) });
              }}
            >
              {createFeedback.isPending ? 'Submitting…' : (feedbackMode === 'give' ? 'Submit Feedback' : 'Send Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V7: Edit review */}
      <Dialog open={!!editReview} onOpenChange={(o) => { if (!o) setEditReview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit review</DialogTitle>
            <DialogDescription>
              {editReview
                ? <>{reviewTypeLabel(editReview.review_type)} for <span className="font-medium text-foreground">{editReview.employee_name || 'employee'}</span></>
                : 'Update the review details.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea rows={4} placeholder="Strengths, areas to improve, examples…" value={editReviewForm.comments} onChange={(e) => setEditReviewForm({ ...editReviewForm, comments: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Overall rating</Label>
                <Select value={editReviewForm.overall_rating || 'none'} onValueChange={(v) => setEditReviewForm({ ...editReviewForm, overall_rating: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="No rating" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No rating</SelectItem>
                    <SelectItem value="1">1 — Needs improvement</SelectItem>
                    <SelectItem value="2">2 — Below expectations</SelectItem>
                    <SelectItem value="3">3 — Meets expectations</SelectItem>
                    <SelectItem value="4">4 — Exceeds expectations</SelectItem>
                    <SelectItem value="5">5 — Outstanding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editReviewForm.status} onValueChange={(v) => setEditReviewForm({ ...editReviewForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReview(null)}>Cancel</Button>
            <Button onClick={saveEditReview} disabled={updateReview.isPending}>{updateReview.isPending ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
