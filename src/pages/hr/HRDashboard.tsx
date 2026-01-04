import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import {
  Briefcase,
  Users,
  CalendarDays,
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Send,
  Bot,
  Video,
  MapPin,
  Building2,
  DollarSign,
  TrendingUp,
  UserPlus,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';

// Mock data
const mockStats = {
  openPositions: 8,
  activeCandidates: 45,
  interviewsScheduled: 12,
  offersPending: 3
};

const mockJobPostings = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary_range: '$120k - $160k',
    status: 'active',
    applications: 24,
    posted_date: '2024-01-10',
    description: 'We are looking for an experienced frontend developer...'
  },
  {
    id: '2',
    title: 'Product Manager',
    department: 'Product',
    location: 'New York, NY',
    type: 'Full-time',
    salary_range: '$130k - $170k',
    status: 'active',
    applications: 18,
    posted_date: '2024-01-08',
    description: 'Lead product strategy and roadmap...'
  },
  {
    id: '3',
    title: 'UX Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary_range: '$100k - $140k',
    status: 'paused',
    applications: 12,
    posted_date: '2024-01-05',
    description: 'Create beautiful user experiences...'
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary_range: '$110k - $150k',
    status: 'active',
    applications: 9,
    posted_date: '2024-01-12',
    description: 'Manage cloud infrastructure and CI/CD...'
  }
];

const mockCandidates = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 555-0123',
    position: 'Senior Frontend Developer',
    stage: 'Technical Interview',
    score: 92,
    ai_screening: 'passed',
    applied_date: '2024-01-11',
    source: 'LinkedIn',
    avatar: null,
    resume_url: '#'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.c@email.com',
    phone: '+1 555-0124',
    position: 'Product Manager',
    stage: 'Phone Screen',
    score: 85,
    ai_screening: 'passed',
    applied_date: '2024-01-10',
    source: 'Referral',
    avatar: null,
    resume_url: '#'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+1 555-0125',
    position: 'UX Designer',
    stage: 'Portfolio Review',
    score: 78,
    ai_screening: 'review',
    applied_date: '2024-01-09',
    source: 'Indeed',
    avatar: null,
    resume_url: '#'
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.k@email.com',
    phone: '+1 555-0126',
    position: 'Senior Frontend Developer',
    stage: 'Offer',
    score: 95,
    ai_screening: 'passed',
    applied_date: '2024-01-08',
    source: 'LinkedIn',
    avatar: null,
    resume_url: '#'
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa.t@email.com',
    phone: '+1 555-0127',
    position: 'DevOps Engineer',
    stage: 'Applied',
    score: 72,
    ai_screening: 'pending',
    applied_date: '2024-01-13',
    source: 'Indeed',
    avatar: null,
    resume_url: '#'
  }
];

const mockInterviews = [
  {
    id: '1',
    candidate_name: 'Sarah Johnson',
    position: 'Senior Frontend Developer',
    type: 'Technical Interview',
    date: addDays(new Date(), 1),
    time: '10:00 AM',
    duration: '60 min',
    interviewer: 'John Smith',
    location: 'Video Call',
    status: 'scheduled'
  },
  {
    id: '2',
    candidate_name: 'Michael Chen',
    position: 'Product Manager',
    type: 'Phone Screen',
    date: addDays(new Date(), 2),
    time: '2:00 PM',
    duration: '30 min',
    interviewer: 'Jane Doe',
    location: 'Phone',
    status: 'scheduled'
  },
  {
    id: '3',
    candidate_name: 'Emily Rodriguez',
    position: 'UX Designer',
    type: 'Portfolio Review',
    date: addDays(new Date(), 3),
    time: '11:00 AM',
    duration: '45 min',
    interviewer: 'Alex Brown',
    location: 'Video Call',
    status: 'scheduled'
  },
  {
    id: '4',
    candidate_name: 'David Kim',
    position: 'Senior Frontend Developer',
    type: 'Final Interview',
    date: new Date(),
    time: '3:00 PM',
    duration: '60 min',
    interviewer: 'CEO',
    location: 'In-person',
    status: 'scheduled'
  }
];

const mockOnboarding = [
  {
    id: '1',
    name: 'Alex Martinez',
    position: 'Backend Developer',
    start_date: addDays(new Date(), 7),
    progress: 65,
    tasks_completed: 8,
    tasks_total: 12,
    status: 'in_progress'
  },
  {
    id: '2',
    name: 'Jennifer Lee',
    position: 'Marketing Manager',
    start_date: addDays(new Date(), 14),
    progress: 25,
    tasks_completed: 3,
    tasks_total: 12,
    status: 'pending'
  }
];

const stageColors: Record<string, string> = {
  'Applied': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'Phone Screen': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Technical Interview': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Portfolio Review': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  'Final Interview': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Offer': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Hired': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const aiScreeningColors: Record<string, string> = {
  passed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const jobBoards = [
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
  { id: 'indeed', name: 'Indeed', icon: Briefcase },
  { id: 'glassdoor', name: 'Glassdoor', icon: Building2 }
];

export default function HRDashboard() {
  const { tenantConfig, tenantId } = useTenant();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [selectedJobBoards, setSelectedJobBoards] = useState<string[]>(['linkedin']);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // New job form state
  const [newJob, setNewJob] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-time',
    salary_min: '',
    salary_max: '',
    description: ''
  });

  // Check feature flag
  if (!tenantConfig?.features?.hr_module) {
    return <Navigate to="/" replace />;
  }

  const handleAddJob = () => {
    toast({
      title: 'Job Posted',
      description: `${newJob.title} has been created and posted to ${selectedJobBoards.length} job board(s).`,
    });
    setIsAddJobOpen(false);
    setNewJob({
      title: '',
      department: '',
      location: '',
      type: 'Full-time',
      salary_min: '',
      salary_max: '',
      description: ''
    });
  };

  const handlePostToBoards = (jobId: string) => {
    toast({
      title: 'Posting to Job Boards',
      description: 'Your job posting is being distributed to selected platforms.',
    });
  };

  const filteredJobs = mockJobPostings.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = mockCandidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calendar helpers
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const getInterviewsForDate = (date: Date) => {
    return mockInterviews.filter(interview => isSameDay(interview.date, date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            HR Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage recruitment, candidates, and onboarding
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.openPositions}</div>
            <p className="text-xs text-muted-foreground">
              Across {new Set(mockJobPostings.map(j => j.department)).size} departments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeCandidates}</div>
            <p className="text-xs text-green-600 dark:text-green-400">
              +12 this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.interviewsScheduled}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.offersPending}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Postings</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Recent Applications
                </CardTitle>
                <CardDescription>Latest candidates who applied</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCandidates.slice(0, 4).map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={candidate.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{candidate.position}</p>
                      </div>
                      <Badge className={stageColors[candidate.stage]}>
                        {candidate.stage}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Interviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Upcoming Interviews
                </CardTitle>
                <CardDescription>Scheduled for the next few days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockInterviews.slice(0, 4).map((interview) => (
                    <div key={interview.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{interview.candidate_name}</p>
                        <p className="text-sm text-muted-foreground">{interview.type}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{format(interview.date, 'MMM d')}</p>
                        <p className="text-muted-foreground">{interview.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Hiring Pipeline
                </CardTitle>
                <CardDescription>Candidates by stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { stage: 'Applied', count: 15, color: 'bg-gray-500' },
                    { stage: 'Phone Screen', count: 12, color: 'bg-blue-500' },
                    { stage: 'Technical Interview', count: 8, color: 'bg-purple-500' },
                    { stage: 'Final Interview', count: 5, color: 'bg-amber-500' },
                    { stage: 'Offer', count: 3, color: 'bg-green-500' }
                  ].map((item) => (
                    <div key={item.stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.stage}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <Progress value={(item.count / 15) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Onboarding in Progress
                </CardTitle>
                <CardDescription>New hires being onboarded</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockOnboarding.map((person) => (
                    <div key={person.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">{person.position}</p>
                        </div>
                        <Badge variant="outline">
                          Starts {format(person.start_date, 'MMM d')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={person.progress} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground">
                          {person.tasks_completed}/{person.tasks_total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Job Postings Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Job Postings</CardTitle>
                  <CardDescription>Manage open positions and job listings</CardDescription>
                </div>
                <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Job
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Job Posting</DialogTitle>
                      <DialogDescription>
                        Add a new job position and optionally post to job boards
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                      <div className="space-y-4 p-1">
                        <div className="space-y-2">
                          <Label>Job Title</Label>
                          <Input
                            placeholder="e.g., Senior Software Engineer"
                            value={newJob.title}
                            onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Department</Label>
                            <Select
                              value={newJob.department}
                              onValueChange={(value) => setNewJob({ ...newJob, department: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Engineering">Engineering</SelectItem>
                                <SelectItem value="Product">Product</SelectItem>
                                <SelectItem value="Design">Design</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={newJob.type}
                              onValueChange={(value) => setNewJob({ ...newJob, type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Full-time">Full-time</SelectItem>
                                <SelectItem value="Part-time">Part-time</SelectItem>
                                <SelectItem value="Contract">Contract</SelectItem>
                                <SelectItem value="Internship">Internship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            placeholder="e.g., Remote, New York, NY"
                            value={newJob.location}
                            onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Salary Min</Label>
                            <Input
                              placeholder="$80,000"
                              value={newJob.salary_min}
                              onChange={(e) => setNewJob({ ...newJob, salary_min: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Salary Max</Label>
                            <Input
                              placeholder="$120,000"
                              value={newJob.salary_max}
                              onChange={(e) => setNewJob({ ...newJob, salary_max: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Job description, requirements, benefits..."
                            rows={4}
                            value={newJob.description}
                            onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Post to Job Boards</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {jobBoards.map((board) => (
                              <div
                                key={board.id}
                                className={cn(
                                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                                  selectedJobBoards.includes(board.id)
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-muted-foreground/50"
                                )}
                                onClick={() => {
                                  setSelectedJobBoards(prev =>
                                    prev.includes(board.id)
                                      ? prev.filter(id => id !== board.id)
                                      : [...prev, board.id]
                                  );
                                }}
                              >
                                <Checkbox checked={selectedJobBoards.includes(board.id)} />
                                <span className="text-sm">{board.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddJobOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddJob}>
                        <Send className="h-4 w-4 mr-2" />
                        Create & Post
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Applications</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{job.title}</p>
                            <p className="text-sm text-muted-foreground">{job.type} • {job.salary_range}</p>
                          </div>
                        </TableCell>
                        <TableCell>{job.department}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {job.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={job.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{job.applications}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(job.posted_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePostToBoards(job.id)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Post to Boards
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Candidates</CardTitle>
                  <CardDescription>Track and manage all applicants</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="technical">Technical Interview</SelectItem>
                    <SelectItem value="final">Final Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="AI Screening" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="review">Needs Review</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>AI Screening</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={candidate.avatar || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {candidate.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{candidate.name}</p>
                              <p className="text-sm text-muted-foreground">{candidate.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{candidate.position}</TableCell>
                        <TableCell>
                          <Badge className={stageColors[candidate.stage]}>
                            {candidate.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium">{candidate.score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={aiScreeningColors[candidate.ai_screening]}>
                            <Bot className="h-3 w-3 mr-1" />
                            {candidate.ai_screening}
                          </Badge>
                        </TableCell>
                        <TableCell>{candidate.source}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Resume
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Move to Next Stage
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Interview Calendar</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-32 text-center">
                      {format(calendarMonth, 'MMMM yyyy')}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month start */}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {/* Month days */}
                  {monthDays.map((day) => {
                    const dayInterviews = getInterviewsForDate(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "aspect-square p-1 rounded-lg cursor-pointer transition-colors hover:bg-muted",
                          isToday(day) && "bg-primary/10",
                          isSelected && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="text-sm text-center mb-1">
                          {format(day, 'd')}
                        </div>
                        {dayInterviews.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {dayInterviews.slice(0, 2).map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                            ))}
                            {dayInterviews.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{dayInterviews.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Interviews */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
                </CardTitle>
                <CardDescription>
                  {selectedDate && `${getInterviewsForDate(selectedDate).length} interview(s) scheduled`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {selectedDate && getInterviewsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-4">
                      {getInterviewsForDate(selectedDate).map((interview) => (
                        <div key={interview.id} className="p-4 rounded-lg border space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{interview.candidate_name}</p>
                              <p className="text-sm text-muted-foreground">{interview.position}</p>
                            </div>
                            <Badge variant="outline">{interview.type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {interview.time} ({interview.duration})
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {interview.location}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {interview.interviewer}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              Reschedule
                            </Button>
                            <Button size="sm" className="flex-1">
                              Join
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
                      <p>No interviews scheduled</p>
                      <p className="text-sm">Select a date to view interviews</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* All Interviews Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Scheduled Interviews</CardTitle>
              <CardDescription>Complete list of upcoming interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Interviewer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockInterviews.map((interview) => (
                      <TableRow key={interview.id}>
                        <TableCell className="font-medium">{interview.candidate_name}</TableCell>
                        <TableCell>{interview.position}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{interview.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(interview.date, 'MMM d, yyyy')} at {interview.time}
                        </TableCell>
                        <TableCell>{interview.interviewer}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Video className="h-3 w-3 text-muted-foreground" />
                            {interview.location}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Onboarding</CardTitle>
                  <CardDescription>Track new hire onboarding progress</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Hire
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {mockOnboarding.map((person) => (
                  <Card key={person.id} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${person.progress}%` }}
                      />
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {person.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{person.name}</CardTitle>
                            <CardDescription>{person.position}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={person.status === 'in_progress' ? 'default' : 'secondary'}>
                          {person.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Start Date</span>
                        <span className="font-medium">{format(person.start_date, 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tasks Completed</span>
                          <span className="font-medium">{person.tasks_completed} of {person.tasks_total}</span>
                        </div>
                        <Progress value={person.progress} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Tasks
                        </Button>
                        <Button size="sm" className="flex-1">
                          Send Reminder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty State Card */}
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-2">Add more new hires</p>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Hire
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
