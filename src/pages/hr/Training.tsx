import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useTraining } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GraduationCap, 
  BookOpen,
  Clock,
  Users,
  Award,
  Play,
  CheckCircle2,
  Search,
  Calendar,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function TrainingPage() {
  const { t } = useTenant();
  const { programs, enrollments, enroll } = useTraining();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Mock data
  const mockPrograms = [
    { 
      id: '1', 
      title: 'Leadership Excellence', 
      description: 'Develop essential leadership skills for managers', 
      provider: 'Internal', 
      duration_hours: 20, 
      category: 'Leadership', 
      format: 'hybrid' as const,
      completion_rate: 78,
      enrolled_count: 45,
      status: 'active' as const
    },
    { 
      id: '2', 
      title: 'Advanced Excel', 
      description: 'Master advanced Excel functions and data analysis', 
      provider: 'LinkedIn Learning', 
      duration_hours: 8, 
      category: 'Technical', 
      format: 'online' as const,
      completion_rate: 92,
      enrolled_count: 120,
      status: 'active' as const
    },
    { 
      id: '3', 
      title: 'Project Management Fundamentals', 
      description: 'Learn core project management methodologies', 
      provider: 'Coursera', 
      duration_hours: 40, 
      category: 'Management', 
      format: 'online' as const,
      completion_rate: 65,
      enrolled_count: 35,
      status: 'active' as const
    },
    { 
      id: '4', 
      title: 'Communication Skills', 
      description: 'Improve professional communication', 
      provider: 'Internal', 
      duration_hours: 12, 
      category: 'Soft Skills', 
      format: 'classroom' as const,
      completion_rate: 85,
      enrolled_count: 80,
      status: 'active' as const
    },
  ];

  const mockEnrollments = [
    { id: '1', program_id: '1', program_title: 'Leadership Excellence', progress: 60, status: 'in_progress' as const, enrolled_at: '2024-01-05' },
    { id: '2', program_id: '2', program_title: 'Advanced Excel', progress: 100, status: 'completed' as const, enrolled_at: '2023-12-01', completed_at: '2024-01-10' },
  ];

  const mockCertifications = [
    { id: '1', name: 'PMP Certification', issued_date: '2023-06-15', expiry_date: '2026-06-15', status: 'valid' },
    { id: '2', name: 'AWS Solutions Architect', issued_date: '2023-09-01', expiry_date: '2026-09-01', status: 'valid' },
  ];

  const categories = ['all', 'Leadership', 'Technical', 'Management', 'Soft Skills'];

  const getFormatBadge = (format: string) => {
    const styles: Record<string, string> = {
      online: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
      classroom: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
      hybrid: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    };
    return (
      <Badge variant="outline" className={styles[format] || styles.online}>
        {format}
      </Badge>
    );
  };

  const handleEnroll = (programId: string) => {
    enroll.mutate({ program_id: programId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Training</h1>
          <p className="text-muted-foreground mt-1">
            Develop skills and advance your career
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockPrograms.length}</p>
                <p className="text-sm text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockEnrollments.filter(e => e.status === 'in_progress').length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockEnrollments.filter(e => e.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockCertifications.length}</p>
                <p className="text-sm text-muted-foreground">Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Course Catalog
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-2">
            <Play className="h-4 w-4" />
            My Learning
          </TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2">
            <Award className="h-4 w-4" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search courses..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.isLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              mockPrograms.map((program) => (
                <Card key={program.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-primary/50" />
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary">{program.category}</Badge>
                      {getFormatBadge(program.format)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{program.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{program.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {program.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {program.enrolled_count}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Completion Rate</span>
                        <span className="font-medium">{program.completion_rate}%</span>
                      </div>
                      <Progress value={program.completion_rate} className="h-1.5" />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handleEnroll(program.id)}
                      disabled={enroll.isPending}
                    >
                      Enroll Now
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>My Learning Journey</CardTitle>
              <CardDescription>Continue your enrolled courses</CardDescription>
            </CardHeader>
            <CardContent>
              {mockEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {mockEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{enrollment.program_title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Enrolled: {enrollment.enrolled_at}
                          </p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={enrollment.status === 'completed' 
                            ? 'bg-chart-2/10 text-chart-2' 
                            : 'bg-chart-3/10 text-chart-3'
                          }
                        >
                          {enrollment.status === 'completed' ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
                          ) : (
                            <><Play className="h-3 w-3 mr-1" /> In Progress</>
                          )}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{enrollment.progress}%</span>
                        </div>
                        <Progress value={enrollment.progress} className="h-2" />
                      </div>
                      {enrollment.status !== 'completed' && (
                        <Button className="mt-4" variant="outline">
                          Continue Learning
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No courses enrolled yet</p>
                  <p className="text-sm text-muted-foreground">
                    Browse the catalog to find courses
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications">
          <Card>
            <CardHeader>
              <CardTitle>My Certifications</CardTitle>
              <CardDescription>Track your professional certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {mockCertifications.length > 0 ? (
                <div className="space-y-4">
                  {mockCertifications.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                          <Award className="h-6 w-6 text-chart-4" />
                        </div>
                        <div>
                          <h4 className="font-medium">{cert.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Issued: {cert.issued_date} • Expires: {cert.expiry_date}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                        {cert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No certifications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Training Schedule</CardTitle>
              <CardDescription>Upcoming training sessions and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No upcoming sessions</p>
                <p className="text-sm text-muted-foreground">
                  Scheduled training will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Skill Gap Analysis */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Skill Gap Analysis</CardTitle>
          </div>
          <CardDescription>Personalized learning recommendations based on your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Leadership</span>
                <span className="text-sm text-chart-2">Strong</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Technical Skills</span>
                <span className="text-sm text-chart-4">Developing</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Communication</span>
                <span className="text-sm text-chart-2">Strong</span>
              </div>
              <Progress value={90} className="h-2" />
            </div>
          </div>
          <Button className="mt-4" variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Full Analysis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
