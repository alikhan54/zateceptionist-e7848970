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

  // Mock data
  const mockGoals = [
    { id: '1', title: 'Complete Q1 Sales Target', progress: 75, status: 'in_progress' as const, target_date: '2024-03-31' },
    { id: '2', title: 'Launch New Product Feature', progress: 45, status: 'in_progress' as const, target_date: '2024-02-28' },
    { id: '3', title: 'Improve Customer Satisfaction', progress: 90, status: 'in_progress' as const, target_date: '2024-01-31' },
    { id: '4', title: 'Reduce Response Time', progress: 100, status: 'completed' as const, target_date: '2024-01-15' },
  ];

  const mockReviews = [
    { id: '1', employee_name: 'John Doe', reviewer_name: 'Jane Smith', period: 'Q4 2023', status: 'completed', overall_rating: 4 },
    { id: '2', employee_name: 'Mike Johnson', reviewer_name: 'Jane Smith', period: 'Q4 2023', status: 'reviewed', overall_rating: 3 },
    { id: '3', employee_name: 'Sarah Wilson', reviewer_name: 'Jane Smith', period: 'Q4 2023', status: 'submitted', overall_rating: undefined },
  ];

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

      {/* Active Review Cycle Banner */}
      <Card className="border-chart-3/20 bg-gradient-to-r from-chart-3/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Q1 2024 Performance Review Cycle</h3>
                <p className="text-sm text-muted-foreground">
                  Self-assessment deadline: January 31, 2024
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-lg font-semibold">65%</p>
              </div>
              <Button variant="outline">View Details</Button>
            </div>
          </div>
          <Progress value={65} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockGoals.length}</p>
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
                <p className="text-2xl font-bold">{mockReviews.length}</p>
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
                <p className="text-2xl font-bold">4.2</p>
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
                <p className="text-2xl font-bold">12</p>
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
              {mockGoals.map((goal) => (
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
                    <span className="text-lg font-bold">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
              ))}
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
              ) : (
                <div className="space-y-4">
                  {mockReviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{review.employee_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{review.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{review.period}</p>
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

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
          <CardDescription>Team performance ratings overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const counts = [5, 25, 45, 20, 5];
              const count = counts[5 - rating];
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-24">
                    {getRatingStars(rating)}
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-chart-4 rounded-full transition-all"
                      style={{ width: `${count}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">{count}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
