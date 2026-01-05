import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  UserPlus, 
  Plus, 
  Search, 
  Briefcase,
  MapPin,
  Clock,
  Users,
  Star,
  ArrowRight,
  Eye,
  Edit,
  MoreHorizontal,
  Mail,
  Phone,
  FileText,
  Calendar,
  Video,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  ExternalLink,
  GripVertical,
  DollarSign
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format, addDays } from 'date-fns';

// Mock data
const mockJobs = [
  { id: '1', title: 'Senior Frontend Developer', department: 'Engineering', location: 'Remote', type: 'Full-time', salary_min: 120000, salary_max: 160000, status: 'active', applications: 24, posted_date: '2024-01-10' },
  { id: '2', title: 'Product Manager', department: 'Product', location: 'New York, NY', type: 'Full-time', salary_min: 130000, salary_max: 170000, status: 'active', applications: 18, posted_date: '2024-01-08' },
  { id: '3', title: 'UX Designer', department: 'Design', location: 'San Francisco, CA', type: 'Full-time', salary_min: 100000, salary_max: 140000, status: 'paused', applications: 12, posted_date: '2024-01-05' },
  { id: '4', title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time', salary_min: 110000, salary_max: 150000, status: 'active', applications: 9, posted_date: '2024-01-12' },
];

const mockCandidates = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+1 555-0123', position: 'Senior Frontend Developer', stage: 'Technical Interview', score: 92, source: 'LinkedIn', applied_date: '2024-01-11' },
  { id: '2', name: 'Michael Chen', email: 'michael.c@email.com', phone: '+1 555-0124', position: 'Product Manager', stage: 'Phone Screen', score: 85, source: 'Referral', applied_date: '2024-01-10' },
  { id: '3', name: 'Emily Rodriguez', email: 'emily.r@email.com', phone: '+1 555-0125', position: 'UX Designer', stage: 'Portfolio Review', score: 78, source: 'Indeed', applied_date: '2024-01-09' },
  { id: '4', name: 'David Kim', email: 'david.k@email.com', phone: '+1 555-0126', position: 'Senior Frontend Developer', stage: 'Offer', score: 95, source: 'LinkedIn', applied_date: '2024-01-08' },
  { id: '5', name: 'Lisa Thompson', email: 'lisa.t@email.com', phone: '+1 555-0127', position: 'DevOps Engineer', stage: 'Applied', score: 72, source: 'Indeed', applied_date: '2024-01-13' },
];

const mockInterviews = [
  { id: '1', candidate: 'Sarah Johnson', position: 'Senior Frontend Developer', type: 'Technical Interview', date: addDays(new Date(), 1), time: '10:00 AM', interviewer: 'John Smith', location: 'Video Call' },
  { id: '2', candidate: 'Michael Chen', position: 'Product Manager', type: 'Phone Screen', date: addDays(new Date(), 2), time: '2:00 PM', interviewer: 'Jane Doe', location: 'Phone' },
  { id: '3', candidate: 'Emily Rodriguez', position: 'UX Designer', type: 'Portfolio Review', date: addDays(new Date(), 3), time: '11:00 AM', interviewer: 'Alex Brown', location: 'Video Call' },
];

const pipelineStages = ['Applied', 'Phone Screen', 'Technical Interview', 'Portfolio Review', 'Final Interview', 'Offer', 'Hired'];

const stageColors: Record<string, string> = {
  'Applied': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'Phone Screen': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Technical Interview': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Portfolio Review': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  'Final Interview': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Offer': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Hired': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function RecruitmentPage() {
  const { t } = useTenant();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('jobs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  const stats = {
    openPositions: mockJobs.filter(j => j.status === 'active').length,
    totalCandidates: mockCandidates.length,
    interviewsScheduled: mockInterviews.length,
    offersPending: mockCandidates.filter(c => c.stage === 'Offer').length,
  };

  const formatSalary = (min: number, max: number) => {
    const formatK = (n: number) => `$${Math.round(n / 1000)}k`;
    return `${formatK(min)} - ${formatK(max)}`;
  };

  const getCandidatesByStage = (stage: string) => {
    return mockCandidates.filter(c => c.stage === stage);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-chart-2';
    if (score >= 75) return 'text-chart-3';
    if (score >= 60) return 'text-chart-4';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-primary" />
            Recruitment
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage job postings and candidates
          </p>
        </div>
        <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Post Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Job Posting</DialogTitle>
              <DialogDescription>
                Fill in the details to post a new job opening
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input placeholder="e.g., Senior Software Engineer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="e.g., Remote, New York, NY" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary Min</Label>
                  <Input type="number" placeholder="100000" />
                </div>
                <div className="space-y-2">
                  <Label>Salary Max</Label>
                  <Input type="number" placeholder="150000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea placeholder="Describe the role, responsibilities, and requirements..." rows={5} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">AI-Assisted Description</p>
                  <p className="text-xs text-muted-foreground">Let AI help you write a compelling job description</p>
                </div>
                <Button variant="outline" size="sm">Generate</Button>
              </div>
              <div className="space-y-2">
                <Label>Publish to Job Boards</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                    <Checkbox className="mr-1 h-3 w-3" /> LinkedIn
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                    <Checkbox className="mr-1 h-3 w-3" /> Indeed
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                    <Checkbox className="mr-1 h-3 w-3" /> Glassdoor
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddJobOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                toast({ title: 'Job posted successfully' });
                setIsAddJobOpen(false);
              }}>Post Job</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openPositions}</p>
                <p className="text-sm text-muted-foreground">Open Positions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCandidates}</p>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.interviewsScheduled}</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offersPending}</p>
                <p className="text-sm text-muted-foreground">Offers Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="jobs">Job Postings</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Postings</CardTitle>
                  <CardDescription>Manage your open positions</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search jobs..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{job.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatSalary(job.salary_min, job.salary_max)}
                          </span>
                          <span>{job.department}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{job.applications}</p>
                        <p className="text-xs text-muted-foreground">applicants</p>
                      </div>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><ExternalLink className="h-4 w-4 mr-2" />Share Link</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <CardTitle>All Candidates</CardTitle>
              <CardDescription>View and manage all applicants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {candidate.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.position}</TableCell>
                      <TableCell>
                        <Badge className={stageColors[candidate.stage]}>{candidate.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className={cn('h-4 w-4', getScoreColor(candidate.score))} />
                          <span className={cn('font-medium', getScoreColor(candidate.score))}>
                            {candidate.score}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.source}</TableCell>
                      <TableCell className="text-muted-foreground">{candidate.applied_date}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Profile</DropdownMenuItem>
                            <DropdownMenuItem><Mail className="h-4 w-4 mr-2" />Send Email</DropdownMenuItem>
                            <DropdownMenuItem><Video className="h-4 w-4 mr-2" />Schedule Interview</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Pipeline</CardTitle>
              <CardDescription>Drag and drop candidates between stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {pipelineStages.slice(0, 6).map((stage) => {
                  const stageCandidates = getCandidatesByStage(stage);
                  return (
                    <div key={stage} className="flex-shrink-0 w-64">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm">{stage}</span>
                        <Badge variant="secondary">{stageCandidates.length}</Badge>
                      </div>
                      <div className="space-y-2 min-h-[400px] p-2 bg-muted/30 rounded-lg">
                        {stageCandidates.map((candidate) => (
                          <div 
                            key={candidate.id} 
                            className="p-3 bg-background rounded-lg border shadow-sm cursor-move hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {candidate.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{candidate.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{candidate.position}</p>
                            <div className="flex items-center justify-between">
                              <span className={cn('text-xs font-medium flex items-center gap-1', getScoreColor(candidate.score))}>
                                <Star className="h-3 w-3" />
                                {candidate.score}%
                              </span>
                              <Badge variant="outline" className="text-xs">{candidate.source}</Badge>
                            </div>
                          </div>
                        ))}
                        {stageCandidates.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No candidates
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Interviews</CardTitle>
                  <CardDescription>Upcoming interviews and meetings</CardDescription>
                </div>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                        <Video className="h-6 w-6 text-chart-3" />
                      </div>
                      <div>
                        <p className="font-medium">{interview.candidate}</p>
                        <p className="text-sm text-muted-foreground">{interview.type} • {interview.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium">{format(interview.date, 'MMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{interview.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{interview.interviewer}</p>
                        <p className="text-xs text-muted-foreground">{interview.location}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Video className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
