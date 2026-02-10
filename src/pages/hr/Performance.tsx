import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { usePerformance } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  TrendingUp, 
  Target, 
  Star,
  Users,
  ClipboardCheck,
  Award,
  MessageSquare,
  Calendar,
  ChevronRight,
  Plus
} from 'lucide-react';

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
    return (
      <Badge variant="outline" className={styles[status] || styles.draft}>
        {status}
      </Badge>
    );
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-chart-4 fill-chart-4' : 'text-muted'}`}
      />
    ));
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / reviews.filter(r => r.overall_rating).length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track goals, reviews, and {t('staff').toLowerCase()} development
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Review
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{goals.filter(g => g.status !== 'completed' && g.status !== 'cancelled').length}</p>
                <p className="text-sm text-muted-foreground">Active Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviews.filter(r => r.status !== 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRating}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviews.filter(r => (r.overall_rating || 0) >= 4).length}</p>
                <p className="text-sm text-muted-foreground">Top Performers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Goals & OKRs
          </TabsTrigger>
          <TabsTrigger value="my-reviews" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            My Reviews
          </TabsTrigger>
          <TabsTrigger value="team-reviews" className="gap-2">
            <Users className="h-4 w-4" />
            Team Reviews
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            360° Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Goals & Objectives</CardTitle>
                <CardDescription>Track progress on your key objectives</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : goals.length > 0 ? (
                goals.map((goal) => (
                  <div key={goal.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{goal.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={goal.status === 'completed' 
                              ? 'bg-chart-2/10 text-chart-2' 
                              : 'bg-chart-3/10 text-chart-3'
                            }
                          >
                            {goal.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Target: {goal.target_date}
                        </p>
                      </div>
                      <span className="text-lg font-bold">{goal.progress_percent}%</span>
                    </div>
                    <Progress value={goal.progress_percent} className="h-2" />
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No goals set yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Goal" to create your first objective</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-reviews">
          <Card>
            <CardHeader>
              <CardTitle>My Performance Reviews</CardTitle>
              <CardDescription>Self-assessments and received feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No reviews assigned to you</p>
                <p className="text-sm text-muted-foreground">
                  Reviews will appear here when a cycle starts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-reviews">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Reviews</CardTitle>
              <CardDescription>Reviews for your direct reports</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{review.employee_name?.charAt(0) || 'E'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{review.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{review.period || `${review.review_period_start || ''} - ${review.review_period_end || ''}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {review.overall_rating && (
                          <div className="flex items-center gap-1">
                            {getRatingStars(review.overall_rating)}
                          </div>
                        )}
                        {getStatusBadge(review.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No team reviews available</p>
                  <p className="text-sm text-muted-foreground">Reviews will appear when a cycle starts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>360° Feedback</CardTitle>
              <CardDescription>Collect and provide peer feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <MessageSquare className="h-10 w-10 mx-auto text-primary mb-3" />
                  <h4 className="font-medium mb-2">Give Feedback</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Provide constructive feedback to your colleagues
                  </p>
                  <Button variant="outline">Start Feedback</Button>
                </div>
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <Star className="h-10 w-10 mx-auto text-chart-4 mb-3" />
                  <h4 className="font-medium mb-2">Request Feedback</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask colleagues for feedback on your performance
                  </p>
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
