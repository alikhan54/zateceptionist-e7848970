import { useTenant } from '@/contexts/TenantContext';
import { usePerformance } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CircularProgress } from '@/components/hr/CircularProgress';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import { 
  TrendingUp, Target, Star, Users, ClipboardCheck, Award, 
  MessageSquare, ChevronRight, Plus, Clock, AlertTriangle
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function PerformancePage() {
  const { t } = useTenant();
  const { data, isLoading } = usePerformance();

  const reviews = data?.reviews || [];
  const goals = data?.goals || [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      submitted: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
      reviewed: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
      completed: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
    };
    return <Badge variant="outline" className={styles[status] || styles.draft}>{status}</Badge>;
  };

  const getRatingStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-chart-4 fill-chart-4' : 'text-muted'}`} />
      ))}
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
        <Button className="gap-2"><Plus className="h-4 w-4" />Create Review</Button>
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
              <Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" />Add Goal</Button>
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
                  <Button variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Add Your First Goal</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-reviews">
          <Card>
            <CardHeader><CardTitle>My Performance Reviews</CardTitle><CardDescription>Self-assessments and received feedback</CardDescription></CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="font-medium text-muted-foreground">No reviews assigned to you</p>
                <p className="text-sm text-muted-foreground">Reviews will appear here when a cycle starts</p>
              </div>
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
                  {reviews.map((review) => (
                    <div key={review.id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <Avatar className="ring-2 ring-background">
                          <AvatarFallback className="bg-primary/10 text-primary">{review.employee_name?.charAt(0) || 'E'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{review.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{review.period || `${review.review_period_start || ''} - ${review.review_period_end || ''}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {review.overall_rating && getRatingStars(review.overall_rating)}
                        {getStatusBadge(review.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
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
                  <Button variant="outline">Start Feedback</Button>
                </div>
                <div className="p-6 bg-muted/50 rounded-xl text-center hover:bg-muted transition-colors cursor-pointer group">
                  <Star className="h-10 w-10 mx-auto text-chart-4 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-2">Request Feedback</h4>
                  <p className="text-sm text-muted-foreground mb-4">Ask colleagues for feedback on your performance</p>
                  <Button variant="outline">Request Feedback</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
