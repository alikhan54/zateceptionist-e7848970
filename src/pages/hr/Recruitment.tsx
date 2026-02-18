import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Plus,
  Search,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Star,
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
  DollarSign,
  Loader2,
  Zap,
  PhoneCall,
  Brain,
  Target,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  useJobRequisitions,
  useJobApplications,
  useCandidates,
  useAIInterviews,
  useSourcingRuns,
  useInterviewSchedules,
  useCreateJob,
  useUpdateApplicationStage,
  useTriggerSourcing,
  useTriggerAIInterview,
  useRecruitmentStats,
  type JobRequisition,
  type JobApplication,
  type AIInterview,
  type SourcingRun,
} from "@/hooks/useRecruitment";

const pipelineStages = [
  "sourced",
  "applied",
  "screening",
  "shortlisted",
  "ai_interview",
  "interview",
  "offered",
  "hired",
  "rejected",
];

const stageLabels: Record<string, string> = {
  sourced: "AI Sourced",
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  ai_interview: "AI Interview",
  interview: "Interview",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
};

const stageColors: Record<string, string> = {
  sourced: "bg-violet-500/10 text-violet-600",
  applied: "bg-muted text-muted-foreground",
  screening: "bg-primary/10 text-primary",
  shortlisted: "bg-chart-3/10 text-chart-3",
  ai_interview: "bg-chart-4/10 text-chart-4",
  interview: "bg-chart-5/10 text-chart-5",
  offered: "bg-chart-2/10 text-chart-2",
  hired: "bg-chart-1/10 text-chart-1",
  rejected: "bg-destructive/10 text-destructive",
};

const statusColors: Record<string, string> = {
  open: "bg-chart-2/10 text-chart-2",
  on_hold: "bg-chart-4/10 text-chart-4",
  closed: "bg-muted text-muted-foreground",
  filled: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-chart-2";
  if (score >= 60) return "text-chart-3";
  if (score >= 40) return "text-chart-4";
  return "text-destructive";
};

const formatSalary = (min: number | null, max: number | null, currency = "AED") => {
  if (!min && !max) return "Not specified";
  const fmt = (n: number) => (currency === "USD" ? `$${Math.round(n / 1000)}k` : `${currency} ${n.toLocaleString()}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
};

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default function RecruitmentPage() {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);

  // Form state for new job
  const [jobForm, setJobForm] = useState({
    job_title: "",
    job_description: "",
    location_city: "",
    location_country: "UAE",
    work_location: "office",
    employment_type: "full_time",
    required_skills: "",
    required_experience_years: "",
    salary_min: "",
    salary_max: "",
    auto_source_enabled: true,
  });

  // Hooks
  const { data: stats, isLoading: statsLoading } = useRecruitmentStats();
  const { data: jobs = [], isLoading: jobsLoading } = useJobRequisitions();
  const { data: applications = [], isLoading: appsLoading } = useJobApplications();
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates();
  const { data: aiInterviews = [], isLoading: aiInterviewsLoading } = useAIInterviews();
  const { data: sourcingRuns = [], isLoading: sourcingLoading } = useSourcingRuns();
  const { data: interviewSchedules = [], isLoading: schedulesLoading } = useInterviewSchedules();

  const createJob = useCreateJob();
  const updateStage = useUpdateApplicationStage();
  const triggerSourcing = useTriggerSourcing();
  const triggerAIInterview = useTriggerAIInterview();

  const filteredJobs = jobs.filter(
    (j) =>
      j.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.location_city || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredCandidates = candidates.filter(
    (c) =>
      (c.full_name || `${c.first_name} ${c.last_name}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.current_position || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getApplicationsByStage = (stage: string) => applications.filter((a) => a.stage === stage);

  const getCandidateName = (app: JobApplication) => {
    if (app.candidate?.full_name) return app.candidate.full_name;
    if (app.candidate) return `${app.candidate.first_name} ${app.candidate.last_name}`;
    return "Unknown";
  };

  const getCandidateInitials = (app: JobApplication) => {
    if (app.candidate) {
      return `${app.candidate.first_name?.[0] || ""}${app.candidate.last_name?.[0] || ""}`;
    }
    return "?";
  };

  const handlePostJob = async () => {
    const skills = jobForm.required_skills
      ? jobForm.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    await createJob.mutateAsync({
      job_title: jobForm.job_title,
      job_description: jobForm.job_description || undefined,
      location_city: jobForm.location_city || undefined,
      location_country: jobForm.location_country,
      work_location: jobForm.work_location,
      employment_type: jobForm.employment_type,
      required_skills: skills,
      required_experience_years: jobForm.required_experience_years
        ? Number(jobForm.required_experience_years)
        : undefined,
      salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : undefined,
      salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : undefined,
      auto_source_enabled: jobForm.auto_source_enabled,
    });

    setIsAddJobOpen(false);
    setJobForm({
      job_title: "",
      job_description: "",
      location_city: "",
      location_country: "UAE",
      work_location: "office",
      employment_type: "full_time",
      required_skills: "",
      required_experience_years: "",
      salary_min: "",
      salary_max: "",
      auto_source_enabled: true,
    });
  };

  const getRecommendationColor = (rec: string | null) => {
    if (!rec) return "bg-muted text-muted-foreground";
    if (rec.includes("advance") || rec.includes("hire")) return "bg-chart-2/10 text-chart-2";
    if (rec.includes("review") || rec.includes("consider")) return "bg-chart-4/10 text-chart-4";
    return "bg-destructive/10 text-destructive";
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
          <p className="text-muted-foreground mt-1">AI-powered hiring pipeline</p>
        </div>
        <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Post Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Job Posting</DialogTitle>
              <DialogDescription>Fill in the details to post a new job opening</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  placeholder="e.g., Senior Software Engineer"
                  value={jobForm.job_title}
                  onChange={(e) => setJobForm((f) => ({ ...f, job_title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="e.g., Dubai"
                    value={jobForm.location_city}
                    onChange={(e) => setJobForm((f) => ({ ...f, location_city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={jobForm.location_country}
                    onValueChange={(v) => setJobForm((f) => ({ ...f, location_country: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="SA">Saudi Arabia</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Location</Label>
                  <Select
                    value={jobForm.work_location}
                    onValueChange={(v) => setJobForm((f) => ({ ...f, work_location: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={jobForm.employment_type}
                    onValueChange={(v) => setJobForm((f) => ({ ...f, employment_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary Min</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 15000"
                    value={jobForm.salary_min}
                    onChange={(e) => setJobForm((f) => ({ ...f, salary_min: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salary Max</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 25000"
                    value={jobForm.salary_max}
                    onChange={(e) => setJobForm((f) => ({ ...f, salary_max: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Required Skills</Label>
                <Input
                  placeholder="e.g., React, TypeScript, Node.js (comma-separated)"
                  value={jobForm.required_skills}
                  onChange={(e) => setJobForm((f) => ({ ...f, required_skills: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Required Experience (years)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 3"
                  value={jobForm.required_experience_years}
                  onChange={(e) => setJobForm((f) => ({ ...f, required_experience_years: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  placeholder="Describe the role, responsibilities, and requirements..."
                  rows={5}
                  value={jobForm.job_description}
                  onChange={(e) => setJobForm((f) => ({ ...f, job_description: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Auto-source candidates</p>
                    <p className="text-xs text-muted-foreground">AI will find matching candidates automatically</p>
                  </div>
                </div>
                <Switch
                  checked={jobForm.auto_source_enabled}
                  onCheckedChange={(v) => setJobForm((f) => ({ ...f, auto_source_enabled: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddJobOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePostJob} disabled={!jobForm.job_title || createJob.isPending}>
                {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Post Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <StatsLoading />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.openJobs ?? 0}</p>
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
                  <p className="text-2xl font-bold">{stats?.totalCandidates ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.aiInterviews ?? 0}</p>
                  <p className="text-sm text-muted-foreground">AI Interviews</p>
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
                  <p className="text-2xl font-bold">{stats?.offersPending ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Offers Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="ai-interviews">AI Interviews</TabsTrigger>
          <TabsTrigger value="sourcing">Sourcing</TabsTrigger>
        </TabsList>

        {/* ===== JOBS TAB ===== */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Requisitions</CardTitle>
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
              {jobsLoading ? (
                <TableLoading />
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-16">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No job postings yet</h3>
                  <p className="text-muted-foreground mb-4">Post your first job to start the AI hiring pipeline</p>
                  <Button onClick={() => setIsAddJobOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Job
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{job.job_title}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                            {job.location_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location_city}, {job.location_country}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {job.employment_type.replace("_", "-")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {job.work_location}
                            </Badge>
                          </div>
                          {job.required_skills && job.required_skills.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {job.required_skills.slice(0, 4).map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {job.required_skills.length > 4 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{job.required_skills.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{job.total_applications}</p>
                          <p className="text-xs text-muted-foreground">applicants</p>
                        </div>
                        {job.ai_candidates_found > 0 && (
                          <div className="text-right">
                            <p className="font-semibold text-primary">{job.ai_candidates_found}</p>
                            <p className="text-xs text-muted-foreground">AI found</p>
                          </div>
                        )}
                        <Badge className={statusColors[job.status] || "bg-muted text-muted-foreground"}>
                          {job.status}
                        </Badge>
                        {job.ai_sourcing_status && (
                          <Badge variant="outline" className="text-xs">
                            <Bot className="h-3 w-3 mr-1" />
                            {job.ai_sourcing_status}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerSourcing.mutate(job.id)}
                          disabled={triggerSourcing.isPending}
                        >
                          {triggerSourcing.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Target className="h-4 w-4 mr-1" />
                              Find Candidates
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Share Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CANDIDATES TAB ===== */}
        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Candidates</CardTitle>
                  <CardDescription>View and manage candidate pool</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {candidatesLoading ? (
                <TableLoading rows={6} />
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No candidates yet</h3>
                  <p className="text-muted-foreground">Post a job and trigger AI sourcing to find candidates</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Enrichment</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => {
                      const name = candidate.full_name || `${candidate.first_name} ${candidate.last_name}`;
                      const initials = `${candidate.first_name?.[0] || ""}${candidate.last_name?.[0] || ""}`;
                      return (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{name}</p>
                                <p className="text-xs text-muted-foreground">{candidate.email || "No email"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{candidate.current_position || "—"}</p>
                              {candidate.current_company && (
                                <p className="text-xs text-muted-foreground">{candidate.current_company}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.total_experience_years != null ? `${candidate.total_experience_years} yrs` : "—"}
                          </TableCell>
                          <TableCell>
                            {candidate.match_score != null ? (
                              <div className="flex items-center gap-2 w-24">
                                <Progress value={candidate.match_score} className="h-2" />
                                <span className={cn("text-xs font-medium", getScoreColor(candidate.match_score))}>
                                  {candidate.match_score}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                candidate.enrichment_status === "completed" && "bg-chart-2/10 text-chart-2",
                                candidate.enrichment_status === "pending" && "bg-chart-4/10 text-chart-4",
                              )}
                            >
                              {candidate.enrichment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{candidate.source}</TableCell>
                          <TableCell>
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
                                {candidate.linkedin_url && (
                                  <DropdownMenuItem>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    LinkedIn
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PIPELINE TAB ===== */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Pipeline</CardTitle>
              <CardDescription>Track candidates across hiring stages</CardDescription>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <TableLoading rows={4} />
              ) : applications.length === 0 ? (
                <div className="text-center py-16">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No applications yet</h3>
                  <p className="text-muted-foreground">Post a job and trigger AI sourcing to find candidates</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {pipelineStages.map((stage) => {
                    const stageApps = getApplicationsByStage(stage);
                    return (
                      <div key={stage} className="flex-shrink-0 w-64">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">{stageLabels[stage]}</span>
                          <Badge variant="secondary">{stageApps.length}</Badge>
                        </div>
                        <div className="space-y-2 min-h-[400px] p-2 bg-muted/30 rounded-lg">
                          {stageApps.map((app) => (
                            <div
                              key={app.id}
                              className="p-3 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getCandidateInitials(app)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm truncate">{getCandidateName(app)}</span>
                              </div>
                              {app.requisition && (
                                <p className="text-xs text-muted-foreground mb-2 truncate">
                                  {app.requisition.job_title}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                {app.ai_match_score != null ? (
                                  <span
                                    className={cn(
                                      "text-xs font-medium flex items-center gap-1",
                                      getScoreColor(app.ai_match_score),
                                    )}
                                  >
                                    <Star className="h-3 w-3" />
                                    {app.ai_match_score}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No score</span>
                                )}
                                {app.source && (
                                  <Badge variant="outline" className="text-xs">
                                    {app.source}
                                  </Badge>
                                )}
                              </div>
                              {/* Stage move buttons */}
                              <div className="flex gap-1 mt-2">
                                {stage !== "hired" && stage !== "rejected" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 text-xs w-full">
                                        Move →
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {pipelineStages
                                        .filter((s) => s !== stage)
                                        .map((s) => (
                                          <DropdownMenuItem
                                            key={s}
                                            onClick={() => updateStage.mutate({ applicationId: app.id, stage: s })}
                                          >
                                            {stageLabels[s]}
                                          </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          ))}
                          {stageApps.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">No candidates</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== INTERVIEWS TAB ===== */}
        <TabsContent value="interviews">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Interviews</CardTitle>
                  <CardDescription>Upcoming human interviews</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <TableLoading rows={3} />
              ) : interviewSchedules.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No interviews scheduled</h3>
                  <p className="text-muted-foreground">
                    Interviews will appear here once candidates progress through the pipeline
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviewSchedules.map((interview: Record<string, unknown>) => (
                    <div
                      key={interview.id as string}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                          <Video className="h-6 w-6 text-chart-3" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {(interview as any).candidate?.full_name ||
                              `${(interview as any).candidate?.first_name || ""} ${(interview as any).candidate?.last_name || ""}`.trim() ||
                              "Candidate"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(interview.interview_type as string) || "Interview"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {interview.scheduled_at && (
                          <div className="text-right">
                            <p className="font-medium">
                              {format(new Date(interview.scheduled_at as string), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(interview.scheduled_at as string), "h:mm a")}
                            </p>
                          </div>
                        )}
                        <Badge variant="outline">{(interview.status as string) || "scheduled"}</Badge>
                        <Button variant="outline" size="sm">
                          <Video className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AI INTERVIEWS TAB ===== */}
        <TabsContent value="ai-interviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Interviews
              </CardTitle>
              <CardDescription>Automated screening interviews conducted by AI</CardDescription>
            </CardHeader>
            <CardContent>
              {aiInterviewsLoading ? (
                <TableLoading rows={4} />
              ) : aiInterviews.length === 0 ? (
                <div className="text-center py-16">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No AI interviews yet</h3>
                  <p className="text-muted-foreground">
                    Move candidates to the AI Interview stage to start automated screening
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {aiInterviews.map((interview) => (
                    <Card key={interview.id} className="border">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <span className="font-medium text-sm capitalize">{interview.interview_type} Interview</span>
                          </div>
                          <Badge
                            className={cn(
                              interview.status === "completed" && "bg-chart-2/10 text-chart-2",
                              interview.status === "in_progress" && "bg-chart-4/10 text-chart-4",
                              interview.status === "scheduled" && "bg-primary/10 text-primary",
                              interview.status === "failed" && "bg-destructive/10 text-destructive",
                              interview.status === "cancelled" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {interview.status}
                          </Badge>
                        </div>

                        {interview.status === "completed" && (
                          <>
                            {/* Scores */}
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: "Overall", score: interview.ai_overall_score },
                                { label: "Technical", score: interview.ai_technical_score },
                                { label: "Communication", score: interview.ai_communication_score },
                                { label: "Cultural Fit", score: interview.ai_cultural_score },
                              ].map((item) => (
                                <div key={item.label} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span
                                      className={cn("font-medium", item.score != null ? getScoreColor(item.score) : "")}
                                    >
                                      {item.score != null ? `${item.score}%` : "—"}
                                    </span>
                                  </div>
                                  <Progress value={item.score || 0} className="h-1.5" />
                                </div>
                              ))}
                            </div>

                            {/* Recommendation */}
                            {interview.ai_recommendation && (
                              <Badge className={getRecommendationColor(interview.ai_recommendation)}>
                                {interview.ai_recommendation}
                              </Badge>
                            )}

                            {/* Strengths */}
                            {interview.ai_strengths && interview.ai_strengths.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-chart-2" />
                                  Strengths
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {interview.ai_strengths.map((s, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Concerns */}
                            {interview.ai_concerns && interview.ai_concerns.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-destructive" />
                                  Concerns
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {interview.ai_concerns.map((c, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {c}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Summary */}
                            {interview.ai_summary && (
                              <p className="text-xs text-muted-foreground line-clamp-3">{interview.ai_summary}</p>
                            )}

                            {interview.call_duration_seconds && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Duration: {Math.round(interview.call_duration_seconds / 60)} min
                              </p>
                            )}
                          </>
                        )}

                        {interview.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed {format(new Date(interview.completed_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SOURCING TAB ===== */}
        <TabsContent value="sourcing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Sourcing Runs
                  </CardTitle>
                  <CardDescription>AI-powered candidate sourcing pipeline runs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sourcingLoading ? (
                <TableLoading rows={4} />
              ) : sourcingRuns.length === 0 ? (
                <div className="text-center py-16">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No sourcing runs yet</h3>
                  <p className="text-muted-foreground">Click "Find Candidates" on a job to start AI sourcing</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phase 1</TableHead>
                      <TableHead>Phase 2</TableHead>
                      <TableHead>Phase 3</TableHead>
                      <TableHead>Phase 4</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Contacted</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourcingRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(run.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {run.trigger_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs",
                              run.status === "completed" && "bg-chart-2/10 text-chart-2",
                              run.status === "running" && "bg-primary/10 text-primary",
                              run.status === "failed" && "bg-destructive/10 text-destructive",
                            )}
                          >
                            {run.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {run.status}
                          </Badge>
                        </TableCell>
                        {(["phase1_status", "phase2_status", "phase3_status", "phase4_status"] as const).map(
                          (phase) => (
                            <TableCell key={phase}>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  run[phase] === "completed" && "bg-chart-2/10 text-chart-2",
                                  run[phase] === "running" && "bg-chart-4/10 text-chart-4",
                                  run[phase] === "failed" && "bg-destructive/10 text-destructive",
                                )}
                              >
                                {run[phase]}
                              </Badge>
                            </TableCell>
                          ),
                        )}
                        <TableCell className="font-medium">{run.total_candidates_found}</TableCell>
                        <TableCell className="font-medium">{run.total_candidates_matched}</TableCell>
                        <TableCell className="font-medium">{run.total_candidates_contacted}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {run.duration_seconds ? `${Math.round(run.duration_seconds / 60)}m` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
