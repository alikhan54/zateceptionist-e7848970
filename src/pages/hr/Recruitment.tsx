import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  GripVertical,
  DollarSign,
  Loader2,
  Send,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  Zap,
  PhoneCall,
  Brain,
  Target,
  TrendingUp,
  RefreshCw,
  Globe,
  FormInput,
} from "lucide-react";
import { useDepartments } from "@/hooks/useHR";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import {
  useJobRequisitions,
  useJobApplications,
  useCandidates,
  useAIInterviews,
  useSourcingRuns,
  useInterviewSchedules,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useUpdateApplicationStage,
  useTriggerSourcing,
  useTriggerAIInterview,
  useRecruitmentStats,
  useAddCandidate,
  useScheduleInterview,
  useApplyToJob,
  useMakeOffer,
  useAcceptOffer,
  useRejectOffer,
  type JobRequisition,
  type JobApplication,
  type Candidate,
  type InterviewSchedule,
  type AIInterview,
  type SourcingRun,
} from "@/hooks/useRecruitment";

const pipelineStages = [
  "applied",
  "screening",
  "phone_screen",
  "interview",
  "technical",
  "final",
  "offer",
  "hired",
  "rejected",
];

const stageLabels: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  phone_screen: "Phone Screen",
  interview: "Interview",
  technical: "Technical",
  final: "Final Round",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const stageColors: Record<string, string> = {
  applied: "bg-muted text-muted-foreground",
  screening: "bg-primary/10 text-primary",
  phone_screen: "bg-violet-500/10 text-violet-600",
  interview: "bg-chart-5/10 text-chart-5",
  technical: "bg-chart-4/10 text-chart-4",
  final: "bg-chart-3/10 text-chart-3",
  offer: "bg-chart-2/10 text-chart-2",
  hired: "bg-chart-1/10 text-chart-1",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  open: "bg-chart-2/10 text-chart-2",
  active: "bg-chart-2/10 text-chart-2",
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
  const { tenantId, tenantConfig } = useTenant();
  const [activeTab, setActiveTab] = useState("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'manual' | 'url' | 'text'>('manual');
  const [careersUrl, setCareersUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedJob, setSelectedJob] = useState<JobRequisition | null>(null);
  const [isViewJobOpen, setIsViewJobOpen] = useState(false);
  const [isEditJobOpen, setIsEditJobOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Candidate state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isViewCandidateOpen, setIsViewCandidateOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    current_company: "",
    current_position: "",
    linkedin_url: "",
    source: "manual",
    notes: "",
  });

  // Interview scheduling state
  const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    application_id: "",
    interview_type: "video",
    scheduled_date: "",
    scheduled_time: "",
    duration_minutes: "60",
    meeting_platform: "google_meet",
    meeting_link: "",
    notes: "",
  });

  // AI Interview trigger state
  const [isStartAIInterviewOpen, setIsStartAIInterviewOpen] = useState(false);
  const [selectedAppForAI, setSelectedAppForAI] = useState("");

  // Apply to Job state
  const [isApplyToJobOpen, setIsApplyToJobOpen] = useState(false);
  const [applyToJobCandidateId, setApplyToJobCandidateId] = useState("");
  const [applyToJobReqId, setApplyToJobReqId] = useState("");
  const [addCandidateJobId, setAddCandidateJobId] = useState(""); // optional job in Add Candidate form

  // Make Offer state
  const [isMakeOfferOpen, setIsMakeOfferOpen] = useState(false);
  const [offerAppId, setOfferAppId] = useState("");
  const [offerForm, setOfferForm] = useState({ salary: "", startDate: "", notes: "" });

  // Onboarding loading state
  const [onboardingLoadingId, setOnboardingLoadingId] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
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
    status: "open" as string,
    auto_source_enabled: true,
  });

  // Form state for new job (manual mode)
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
  const { data: departments = [] } = useDepartments();

  const queryClient = useQueryClient();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const updateStage = useUpdateApplicationStage();
  const triggerSourcing = useTriggerSourcing();
  const triggerAIInterview = useTriggerAIInterview();
  const addCandidate = useAddCandidate();
  const scheduleInterview = useScheduleInterview();
  const applyToJob = useApplyToJob();
  const makeOffer = useMakeOffer();
  const acceptOffer = useAcceptOffer();
  const rejectOffer = useRejectOffer();

  // Open jobs for selectors
  const openJobs = jobs.filter((j) => j.status === 'open' || j.status === 'active');

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
    const WEBHOOK_BASE = 'https://webhooks.zatesystems.com/webhook';
    const tenantUuid = tenantConfig?.id || tenantId;

    const payload: any = {
      tenant_id: tenantUuid,
      mode: inputMode,
    };

    if (inputMode === 'url') {
      payload.careers_url = careersUrl;
      payload.department_id = departmentId || null;
      payload.priority = priority;
    } else if (inputMode === 'text') {
      payload.raw_text = rawText;
      payload.department_id = departmentId || null;
      payload.priority = priority;
    } else {
      const skills = jobForm.required_skills
        ? jobForm.required_skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      payload.job_title = jobForm.job_title;
      payload.job_type = jobForm.employment_type;
      payload.experience_level = jobForm.required_experience_years || 'mid';
      payload.location = jobForm.location_city;
      payload.country = jobForm.location_country;
      payload.is_remote = jobForm.work_location === 'remote';
      payload.salary_min = jobForm.salary_min ? parseFloat(jobForm.salary_min) : null;
      payload.salary_max = jobForm.salary_max ? parseFloat(jobForm.salary_max) : null;
      payload.salary_currency = 'AED';
      payload.description = jobForm.job_description;
      payload.skills_required = skills.join(', ');
      payload.department_id = departmentId || null;
      payload.positions_count = 1;
      payload.priority = priority;
      payload.auto_source = jobForm.auto_source_enabled;
      payload.work_location = jobForm.work_location;
    }

    try {
      const response = await fetch(`${WEBHOOK_BASE}/hr/job/ai-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create job posting');
      }

      const data = await response.json();
      const jobTitle = data?.job_title || jobForm.job_title || 'New position';
      const reqNumber = data?.requisition_number || '';

      if (data?.ai_enriched) {
        toast.success(`${jobTitle} created with AI enrichment${reqNumber ? ` (${reqNumber})` : ''}`);
      } else {
        toast.success(`${jobTitle} posted successfully${reqNumber ? ` (${reqNumber})` : ''}`);
      }

      // Invalidate queries to refresh job list
      queryClient.invalidateQueries({ queryKey: ['hr_job_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment_stats'] });
    } catch (error: any) {
      // Fallback: if webhook fails for manual mode, insert directly
      if (inputMode === 'manual') {
        const skills = jobForm.required_skills
          ? jobForm.required_skills.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;
        await createJob.mutateAsync({
          job_title: jobForm.job_title,
          job_description: jobForm.job_description || undefined,
          location_city: jobForm.location_city || undefined,
          location_country: jobForm.location_country,
          work_location: jobForm.work_location,
          employment_type: jobForm.employment_type,
          required_skills: skills,
          required_experience_years: jobForm.required_experience_years ? Number(jobForm.required_experience_years) : undefined,
          salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : undefined,
          salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : undefined,
          priority: priority || 'normal',
          auto_source_enabled: jobForm.auto_source_enabled,
        } as any);
      } else {
        toast.error(error.message || 'Failed to create job posting');
      }
    }

    resetJobForm();
    setIsAddJobOpen(false);
  };

  const resetJobForm = () => {
    setJobForm({
      job_title: "", job_description: "", location_city: "", location_country: "UAE",
      work_location: "office", employment_type: "full_time", required_skills: "",
      required_experience_years: "", salary_min: "", salary_max: "", auto_source_enabled: true,
    });
    setInputMode('manual');
    setCareersUrl("");
    setRawText("");
    setDepartmentId("");
    setPriority("medium");
  };

  const openEditDialog = (job: JobRequisition) => {
    setSelectedJob(job);
    setEditForm({
      job_title: job.job_title,
      job_description: job.job_description || "",
      location_city: job.location_city || "",
      location_country: job.location_country || "UAE",
      work_location: job.work_location || "office",
      employment_type: job.employment_type || "full_time",
      required_skills: job.required_skills?.join(", ") || "",
      required_experience_years: job.required_experience_years?.toString() || "",
      salary_min: job.salary_min?.toString() || "",
      salary_max: job.salary_max?.toString() || "",
      status: job.status,
      auto_source_enabled: job.auto_source_enabled,
    });
    setIsEditJobOpen(true);
  };

  const handleEditJob = async () => {
    if (!selectedJob) return;
    const skills = editForm.required_skills
      ? editForm.required_skills.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    await updateJob.mutateAsync({
      id: selectedJob.id,
      job_title: editForm.job_title,
      job_description: editForm.job_description || null,
      location_city: editForm.location_city || null,
      location_country: editForm.location_country,
      work_location: editForm.work_location,
      employment_type: editForm.employment_type,
      required_skills: skills,
      required_experience_years: editForm.required_experience_years ? Number(editForm.required_experience_years) : null,
      salary_min: editForm.salary_min ? Number(editForm.salary_min) : null,
      salary_max: editForm.salary_max ? Number(editForm.salary_max) : null,
      status: editForm.status as JobRequisition['status'],
      auto_source_enabled: editForm.auto_source_enabled,
    });
    setIsEditJobOpen(false);
    setSelectedJob(null);
  };

  const handleDeleteJob = async () => {
    if (!selectedJob) return;
    await deleteJob.mutateAsync(selectedJob.id);
    setIsDeleteConfirmOpen(false);
    setSelectedJob(null);
  };

  const getRecommendationColor = (rec: string | null) => {
    if (!rec) return "bg-muted text-muted-foreground";
    if (rec.includes("advance") || rec.includes("hire")) return "bg-chart-2/10 text-chart-2";
    if (rec.includes("review") || rec.includes("consider")) return "bg-chart-4/10 text-chart-4";
    return "bg-destructive/10 text-destructive";
  };

  const handleAddCandidate = async () => {
    if (!candidateForm.first_name || !candidateForm.last_name) return;
    const newCandidate = await addCandidate.mutateAsync({
      first_name: candidateForm.first_name,
      last_name: candidateForm.last_name,
      email: candidateForm.email || undefined,
      phone: candidateForm.phone || undefined,
      current_company: candidateForm.current_company || undefined,
      current_position: candidateForm.current_position || undefined,
      linkedin_url: candidateForm.linkedin_url || undefined,
      source: candidateForm.source,
      notes: candidateForm.notes || undefined,
    });
    // If a job was selected, auto-apply the candidate
    if (addCandidateJobId && newCandidate?.id) {
      try {
        await applyToJob.mutateAsync({
          candidateId: newCandidate.id,
          jobRequisitionId: addCandidateJobId,
        });
      } catch {
        // Candidate was created but application failed — user can apply manually later
      }
    }
    setCandidateForm({ first_name: "", last_name: "", email: "", phone: "", current_company: "", current_position: "", linkedin_url: "", source: "manual", notes: "" });
    setAddCandidateJobId("");
    setIsAddCandidateOpen(false);
  };

  const handleScheduleInterview = async () => {
    if (!interviewForm.application_id || !interviewForm.scheduled_date || !interviewForm.scheduled_time) return;
    await scheduleInterview.mutateAsync({
      application_id: interviewForm.application_id,
      interview_type: interviewForm.interview_type,
      scheduled_date: interviewForm.scheduled_date,
      scheduled_time: interviewForm.scheduled_time,
      duration_minutes: interviewForm.duration_minutes ? Number(interviewForm.duration_minutes) : 60,
      meeting_platform: interviewForm.meeting_platform || undefined,
      meeting_link: interviewForm.meeting_link || undefined,
      notes: interviewForm.notes || undefined,
    });
    setInterviewForm({ application_id: "", interview_type: "video", scheduled_date: "", scheduled_time: "", duration_minutes: "60", meeting_platform: "google_meet", meeting_link: "", notes: "" });
    setIsScheduleInterviewOpen(false);
  };

  const handleStartAIInterview = async () => {
    if (!selectedAppForAI) return;
    const app = applications.find((a) => a.id === selectedAppForAI);
    if (!app) return;
    await triggerAIInterview.mutateAsync({
      applicationId: app.id,
      candidateId: app.candidate_id,
      jobRequisitionId: app.job_requisition_id,
    });
    setSelectedAppForAI("");
    setIsStartAIInterviewOpen(false);
  };

  // Get eligible applications for AI interview (at interview/technical stage)
  const eligibleForAIInterview = applications.filter(
    (a) => a.stage === 'interview' || a.stage === 'technical'
  );

  const handleApplyToJob = async () => {
    if (!applyToJobCandidateId || !applyToJobReqId) return;
    const job = jobs.find((j) => j.id === applyToJobReqId);
    await applyToJob.mutateAsync({
      candidateId: applyToJobCandidateId,
      jobRequisitionId: applyToJobReqId,
    });
    toast.success(`Candidate applied to ${job?.job_title || 'job'}`);
    setApplyToJobCandidateId("");
    setApplyToJobReqId("");
    setIsApplyToJobOpen(false);
  };

  const handleMakeOffer = async () => {
    if (!offerAppId || !offerForm.salary) return;
    await makeOffer.mutateAsync({
      applicationId: offerAppId,
      salary: Number(offerForm.salary),
      startDate: offerForm.startDate || undefined,
      notes: offerForm.notes || undefined,
    });
    setOfferForm({ salary: "", startDate: "", notes: "" });
    setOfferAppId("");
    setIsMakeOfferOpen(false);
  };

  const handleStartOnboarding = async (app: JobApplication) => {
    if (!tenantId || !app.candidate) return;
    setOnboardingLoadingId(app.id);
    try {
      const result = await callWebhook(WEBHOOKS.EMPLOYEE_ONBOARDING, {
        first_name: app.candidate.first_name,
        last_name: app.candidate.last_name,
        email: app.candidate.email || '',
        phone: app.candidate.phone || '',
        position: app.requisition?.job_title || '',
        employment_type: 'full_time',
        start_date: new Date().toISOString().split('T')[0],
        salary: app.offer_salary || null,
        source: 'recruitment',
      }, tenantId);

      if (result.success) {
        toast.success(`${app.candidate.full_name || app.candidate.first_name} onboarding started!`);
        // Mark application with onboarding note
        await supabase
          .from('hr_job_applications')
          .update({ notes: ((app.notes || '') + '\n[Onboarding triggered]').trim() })
          .eq('id', app.id);
        queryClient.invalidateQueries({ queryKey: ['hr_job_applications'] });
      } else {
        toast.error('Failed to start onboarding: ' + (result.error || 'Unknown error'));
      }
    } catch {
      toast.error('Failed to start onboarding');
    } finally {
      setOnboardingLoadingId(null);
    }
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
              {/* Input Mode Selector */}
              <div className="flex gap-2 mb-2">
                <Button variant={inputMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('manual')}>
                  <FormInput className="w-4 h-4 mr-1" /> Manual
                </Button>
                <Button variant={inputMode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('url')}>
                  <Globe className="w-4 h-4 mr-1" /> From URL
                </Button>
                <Button variant={inputMode === 'text' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('text')}>
                  <FileText className="w-4 h-4 mr-1" /> Paste Description
                </Button>
              </div>

              {inputMode === 'url' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Paste any job posting URL — AI will extract title, skills, requirements, and salary automatically</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Job Posting URL or Careers Page URL</Label>
                    <Input placeholder="https://company.com/careers/role-name" value={careersUrl} onChange={(e) => setCareersUrl(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department (optional)</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {inputMode === 'text' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">AI will extract: job title, required skills, experience level, employment type, salary range, and more</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Paste Job Description</Label>
                    <Textarea placeholder="Paste the full job description here. AI will extract all details automatically..." value={rawText} onChange={(e) => setRawText(e.target.value)} rows={10} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department (optional)</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {inputMode === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Title *</Label>
                    <Input placeholder="e.g., Senior Software Engineer" value={jobForm.job_title} onChange={(e) => setJobForm((f) => ({ ...f, job_title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="e.g., Dubai" value={jobForm.location_city} onChange={(e) => setJobForm((f) => ({ ...f, location_city: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={jobForm.location_country} onValueChange={(v) => setJobForm((f) => ({ ...f, location_country: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Select value={jobForm.work_location} onValueChange={(v) => setJobForm((f) => ({ ...f, work_location: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Type</Label>
                      <Select value={jobForm.employment_type} onValueChange={(v) => setJobForm((f) => ({ ...f, employment_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Input type="number" placeholder="e.g., 15000" value={jobForm.salary_min} onChange={(e) => setJobForm((f) => ({ ...f, salary_min: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary Max</Label>
                      <Input type="number" placeholder="e.g., 25000" value={jobForm.salary_max} onChange={(e) => setJobForm((f) => ({ ...f, salary_max: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Required Skills</Label>
                    <Input placeholder="e.g., React, TypeScript, Node.js (comma-separated)" value={jobForm.required_skills} onChange={(e) => setJobForm((f) => ({ ...f, required_skills: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Required Experience (years)</Label>
                    <Input type="number" placeholder="e.g., 3" value={jobForm.required_experience_years} onChange={(e) => setJobForm((f) => ({ ...f, required_experience_years: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department (optional)</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Job Description</Label>
                    <Textarea placeholder="Describe the role, responsibilities, and requirements..." rows={5} value={jobForm.job_description} onChange={(e) => setJobForm((f) => ({ ...f, job_description: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Auto-source candidates</p>
                        <p className="text-xs text-muted-foreground">AI will find matching candidates automatically</p>
                      </div>
                    </div>
                    <Switch checked={jobForm.auto_source_enabled} onCheckedChange={(v) => setJobForm((f) => ({ ...f, auto_source_enabled: v }))} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddJobOpen(false); resetJobForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handlePostJob}
                disabled={
                  (inputMode === 'manual' && !jobForm.job_title) ||
                  (inputMode === 'url' && !careersUrl) ||
                  (inputMode === 'text' && !rawText) ||
                  createJob.isPending
                }
              >
                {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {inputMode === 'manual' ? 'Post Job' : (
                  <><Sparkles className="h-4 w-4 mr-1" /> Create with AI</>
                )}
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{job.job_title}</h4>
                            {(job as any).ai_enriched && (
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                                <Sparkles className="w-3 h-3 mr-1" /> AI Enhanced
                              </Badge>
                            )}
                          </div>
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
                            <DropdownMenuItem onClick={() => { setSelectedJob(job); setIsViewJobOpen(true); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(job)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setSelectedJob(job); setIsDeleteConfirmOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setIsAddCandidateOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Candidate
                  </Button>
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
                                <DropdownMenuItem onClick={() => { setSelectedCandidate(candidate); setIsViewCandidateOpen(true); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setApplyToJobCandidateId(candidate.id); setApplyToJobReqId(""); setIsApplyToJobOpen(true); }}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Apply to Job
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {candidate.linkedin_url && (
                                  <DropdownMenuItem onClick={() => window.open(candidate.linkedin_url!, "_blank")}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    LinkedIn
                                  </DropdownMenuItem>
                                )}
                                {candidate.email && (
                                  <DropdownMenuItem onClick={() => window.open(`mailto:${candidate.email}`, "_blank")}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                )}
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
                              {/* Stage-specific action buttons */}
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {/* Offer stage: Accept / Reject */}
                                {stage === "offer" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs flex-1 text-chart-2 hover:text-chart-2 hover:bg-chart-2/10"
                                      onClick={() => acceptOffer.mutate({
                                        applicationId: app.id,
                                        candidateId: app.candidate_id,
                                      })}
                                      disabled={acceptOffer.isPending}
                                    >
                                      <ThumbsUp className="h-3 w-3 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => rejectOffer.mutate(app.id)}
                                      disabled={rejectOffer.isPending}
                                    >
                                      <ThumbsDown className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}

                                {/* Hired stage: Start Onboarding */}
                                {stage === "hired" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs w-full text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => handleStartOnboarding(app)}
                                    disabled={onboardingLoadingId === app.id}
                                  >
                                    {onboardingLoadingId === app.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-3 w-3 mr-1" />
                                    )}
                                    Start Onboarding
                                  </Button>
                                )}

                                {/* Interview/Technical/Final stages: Move + Make Offer */}
                                {(stage === "interview" || stage === "technical" || stage === "final") && (
                                  <>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 text-xs flex-1">
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
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs flex-1 text-chart-2 hover:text-chart-2 hover:bg-chart-2/10"
                                      onClick={() => { setOfferAppId(app.id); setOfferForm({ salary: "", startDate: "", notes: "" }); setIsMakeOfferOpen(true); }}
                                    >
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      Offer
                                    </Button>
                                  </>
                                )}

                                {/* Applied/Screening/Phone Screen stages: Move only */}
                                {(stage === "applied" || stage === "screening" || stage === "phone_screen") && (
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

                                {/* Rejected: no actions */}
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
                <Button onClick={() => setIsScheduleInterviewOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
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
                  {interviewSchedules.map((interview: InterviewSchedule) => {
                    const candidateName =
                      interview.application?.candidate?.full_name ||
                      `${interview.application?.candidate?.first_name || ""} ${interview.application?.candidate?.last_name || ""}`.trim() ||
                      "Candidate";
                    const jobTitle = interview.application?.requisition?.job_title;

                    return (
                      <div
                        key={interview.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                            <Video className="h-6 w-6 text-chart-3" />
                          </div>
                          <div>
                            <p className="font-medium">{candidateName}</p>
                            {jobTitle && (
                              <p className="text-xs text-muted-foreground">{jobTitle}</p>
                            )}
                            <p className="text-sm text-muted-foreground capitalize">
                              {(interview.interview_type || "interview").replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {interview.scheduled_date && (
                            <div className="text-right">
                              <p className="font-medium">
                                {format(new Date(interview.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
                              </p>
                              {interview.scheduled_time && (
                                <p className="text-sm text-muted-foreground">
                                  {interview.scheduled_time}
                                </p>
                              )}
                            </div>
                          )}
                          <Badge variant="outline" className={cn(
                            interview.status === "confirmed" && "bg-chart-2/10 text-chart-2",
                            interview.status === "scheduled" && "bg-primary/10 text-primary",
                            interview.status === "completed" && "bg-chart-1/10 text-chart-1",
                            interview.status === "cancelled" && "bg-destructive/10 text-destructive",
                          )}>
                            {interview.status || "scheduled"}
                          </Badge>
                          {interview.meeting_link ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(interview.meeting_link!, "_blank")}
                            >
                              <Video className="h-4 w-4 mr-1" />
                              Join
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              <Video className="h-4 w-4 mr-1" />
                              No Link
                            </Button>
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

        {/* ===== AI INTERVIEWS TAB ===== */}
        <TabsContent value="ai-interviews">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Interviews
                  </CardTitle>
                  <CardDescription>Automated screening interviews conducted by AI</CardDescription>
                </div>
                <Button
                  onClick={() => setIsStartAIInterviewOpen(true)}
                  disabled={eligibleForAIInterview.length === 0}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Start AI Interview
                </Button>
              </div>
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

      {/* ===== VIEW JOB DIALOG ===== */}
      <Dialog open={isViewJobOpen} onOpenChange={setIsViewJobOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {selectedJob?.job_title}
            </DialogTitle>
            <DialogDescription>
              {selectedJob?.requisition_number} &middot; Created {selectedJob?.created_at ? format(new Date(selectedJob.created_at), "MMM d, yyyy") : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6 py-4">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                <Badge className={statusColors[selectedJob.status] || "bg-muted text-muted-foreground"}>
                  {selectedJob.status}
                </Badge>
                <Badge variant="outline">{selectedJob.priority}</Badge>
                {(selectedJob as any).ai_enriched && (
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <Sparkles className="w-3 h-3 mr-1" /> AI Enhanced
                  </Badge>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedJob.location_city ? `${selectedJob.location_city}, ${selectedJob.location_country}` : selectedJob.location_country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Work Location</p>
                  <p className="font-medium capitalize">{selectedJob.work_location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employment Type</p>
                  <p className="font-medium">{selectedJob.employment_type.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Salary</p>
                  <p className="font-medium">{formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Openings</p>
                  <p className="font-medium">{selectedJob.number_of_openings}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Experience Required</p>
                  <p className="font-medium">{selectedJob.required_experience_years != null ? `${selectedJob.required_experience_years} years` : "Not specified"}</p>
                </div>
              </div>

              {/* Skills */}
              {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.required_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedJob.job_description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedJob.job_description}</p>
                </div>
              )}

              {/* Responsibilities */}
              {selectedJob.responsibilities && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Responsibilities</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedJob.responsibilities}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-5 gap-3 pt-2 border-t">
                {[
                  { label: "Applications", value: selectedJob.total_applications },
                  { label: "Shortlisted", value: selectedJob.shortlisted_count },
                  { label: "Interviewed", value: selectedJob.interviewed_count },
                  { label: "Offered", value: selectedJob.offered_count },
                  { label: "Hired", value: selectedJob.hired_count },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* AI Sourcing Info */}
              {selectedJob.ai_sourcing_status && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">AI Sourcing: {selectedJob.ai_sourcing_status}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedJob.ai_candidates_found} candidates found
                      {selectedJob.ai_sourcing_last_run && ` &middot; Last run: ${format(new Date(selectedJob.ai_sourcing_last_run), "MMM d, yyyy")}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== EDIT JOB DIALOG ===== */}
      <Dialog open={isEditJobOpen} onOpenChange={setIsEditJobOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>Update the job details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={editForm.job_title} onChange={(e) => setEditForm((f) => ({ ...f, job_title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={editForm.location_city} onChange={(e) => setEditForm((f) => ({ ...f, location_city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={editForm.location_country} onValueChange={(v) => setEditForm((f) => ({ ...f, location_country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={editForm.work_location} onValueChange={(v) => setEditForm((f) => ({ ...f, work_location: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={editForm.employment_type} onValueChange={(v) => setEditForm((f) => ({ ...f, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" value={editForm.salary_min} onChange={(e) => setEditForm((f) => ({ ...f, salary_min: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Salary Max</Label>
                <Input type="number" value={editForm.salary_max} onChange={(e) => setEditForm((f) => ({ ...f, salary_max: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Required Skills</Label>
              <Input placeholder="Comma-separated" value={editForm.required_skills} onChange={(e) => setEditForm((f) => ({ ...f, required_skills: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Input type="number" value={editForm.required_experience_years} onChange={(e) => setEditForm((f) => ({ ...f, required_experience_years: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea rows={5} value={editForm.job_description} onChange={(e) => setEditForm((f) => ({ ...f, job_description: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Auto-source candidates</p>
                  <p className="text-xs text-muted-foreground">AI will find matching candidates automatically</p>
                </div>
              </div>
              <Switch checked={editForm.auto_source_enabled} onCheckedChange={(v) => setEditForm((f) => ({ ...f, auto_source_enabled: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditJobOpen(false)}>Cancel</Button>
            <Button onClick={handleEditJob} disabled={!editForm.job_title || updateJob.isPending}>
              {updateJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{selectedJob?.job_title}&rdquo;? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteJob}
              disabled={deleteJob.isPending}
            >
              {deleteJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== VIEW CANDIDATE PROFILE DIALOG ===== */}
      <Dialog open={isViewCandidateOpen} onOpenChange={setIsViewCandidateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedCandidate?.full_name || `${selectedCandidate?.first_name || ""} ${selectedCandidate?.last_name || ""}`}
            </DialogTitle>
            <DialogDescription>
              {selectedCandidate?.current_position && selectedCandidate?.current_company
                ? `${selectedCandidate.current_position} at ${selectedCandidate.current_company}`
                : selectedCandidate?.current_position || selectedCandidate?.current_company || "Candidate Profile"}
            </DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6 py-4">
              {/* Status & Source */}
              <div className="flex items-center gap-3">
                <Badge className={cn(
                  selectedCandidate.status === "active" && "bg-chart-2/10 text-chart-2",
                  selectedCandidate.status === "hired" && "bg-chart-1/10 text-chart-1",
                  selectedCandidate.status === "blacklisted" && "bg-destructive/10 text-destructive",
                  selectedCandidate.status === "archived" && "bg-muted text-muted-foreground",
                )}>
                  {selectedCandidate.status}
                </Badge>
                <Badge variant="outline">{selectedCandidate.source}</Badge>
                <Badge variant="outline" className={cn(
                  selectedCandidate.enrichment_status === "completed" && "bg-chart-2/10 text-chart-2",
                  selectedCandidate.enrichment_status === "pending" && "bg-chart-4/10 text-chart-4",
                  selectedCandidate.enrichment_status === "in_progress" && "bg-primary/10 text-primary",
                  selectedCandidate.enrichment_status === "failed" && "bg-destructive/10 text-destructive",
                )}>
                  Enrichment: {selectedCandidate.enrichment_status}
                </Badge>
              </div>

              {/* Match Score */}
              {selectedCandidate.match_score != null && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Match Score</p>
                  <div className="flex items-center gap-3">
                    <Progress value={selectedCandidate.match_score} className="h-3 flex-1" />
                    <span className={cn("text-lg font-bold", getScoreColor(selectedCandidate.match_score))}>
                      {selectedCandidate.match_score}%
                    </span>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCandidate.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCandidate.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedCandidate.current_location || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Experience</p>
                  <p className="font-medium">{selectedCandidate.total_experience_years != null ? `${selectedCandidate.total_experience_years} years` : "Not specified"}</p>
                </div>
              </div>

              {/* Skills */}
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-3">
                {selectedCandidate.linkedin_url && (
                  <Button variant="outline" size="sm" onClick={() => window.open(selectedCandidate.linkedin_url!, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LinkedIn
                  </Button>
                )}
                {selectedCandidate.resume_url && (
                  <Button variant="outline" size="sm" onClick={() => window.open(selectedCandidate.resume_url!, "_blank")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                {selectedCandidate.email && (
                  <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${selectedCandidate.email}`, "_blank")}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>

              {/* Contact Strategy */}
              {selectedCandidate.contact_strategy && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">AI Contact Strategy</p>
                  <p className="text-sm whitespace-pre-wrap bg-primary/5 p-3 rounded-lg border border-primary/20">{selectedCandidate.contact_strategy}</p>
                </div>
              )}

              {/* Added date */}
              <p className="text-xs text-muted-foreground">
                Added {format(new Date(selectedCandidate.created_at), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== ADD CANDIDATE DIALOG ===== */}
      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
            <DialogDescription>Add a new candidate to your talent pool</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={candidateForm.first_name} onChange={(e) => setCandidateForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={candidateForm.last_name} onChange={(e) => setCandidateForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={candidateForm.email} onChange={(e) => setCandidateForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={candidateForm.phone} onChange={(e) => setCandidateForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Company</Label>
                <Input value={candidateForm.current_company} onChange={(e) => setCandidateForm((f) => ({ ...f, current_company: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Current Position</Label>
                <Input value={candidateForm.current_position} onChange={(e) => setCandidateForm((f) => ({ ...f, current_position: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input placeholder="https://linkedin.com/in/..." value={candidateForm.linkedin_url} onChange={(e) => setCandidateForm((f) => ({ ...f, linkedin_url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={candidateForm.source} onValueChange={(v) => setCandidateForm((f) => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="indeed">Indeed</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={candidateForm.notes} onChange={(e) => setCandidateForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {openJobs.length > 0 && (
              <div className="space-y-2">
                <Label>Apply to Job (optional)</Label>
                <Select value={addCandidateJobId} onValueChange={setAddCandidateJobId}>
                  <SelectTrigger><SelectValue placeholder="Select a job to auto-apply" /></SelectTrigger>
                  <SelectContent>
                    {openJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>{job.job_title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">If selected, the candidate will be automatically applied to this job</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddCandidateOpen(false); setAddCandidateJobId(""); }}>Cancel</Button>
            <Button onClick={handleAddCandidate} disabled={!candidateForm.first_name || !candidateForm.last_name || addCandidate.isPending}>
              {(addCandidate.isPending || applyToJob.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SCHEDULE INTERVIEW DIALOG ===== */}
      <Dialog open={isScheduleInterviewOpen} onOpenChange={setIsScheduleInterviewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Schedule a new interview for a candidate</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Application *</Label>
              <Select value={interviewForm.application_id} onValueChange={(v) => setInterviewForm((f) => ({ ...f, application_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a candidate application" /></SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {getCandidateName(app)} — {app.requisition?.job_title || "Unknown Job"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interview Type *</Label>
              <Select value={interviewForm.interview_type} onValueChange={(v) => setInterviewForm((f) => ({ ...f, interview_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_screen">Phone Screen</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="panel">Panel</SelectItem>
                  <SelectItem value="hr">HR Interview</SelectItem>
                  <SelectItem value="final">Final Round</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={interviewForm.scheduled_date} onChange={(e) => setInterviewForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input type="time" value={interviewForm.scheduled_time} onChange={(e) => setInterviewForm((f) => ({ ...f, scheduled_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={interviewForm.duration_minutes} onChange={(e) => setInterviewForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={interviewForm.meeting_platform} onValueChange={(v) => setInterviewForm((f) => ({ ...f, meeting_platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="ms_teams">MS Teams</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input placeholder="https://meet.google.com/..." value={interviewForm.meeting_link} onChange={(e) => setInterviewForm((f) => ({ ...f, meeting_link: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={interviewForm.notes} onChange={(e) => setInterviewForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleInterviewOpen(false)}>Cancel</Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={!interviewForm.application_id || !interviewForm.scheduled_date || !interviewForm.scheduled_time || scheduleInterview.isPending}
            >
              {scheduleInterview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== START AI INTERVIEW DIALOG ===== */}
      <Dialog open={isStartAIInterviewOpen} onOpenChange={setIsStartAIInterviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Start AI Interview
            </DialogTitle>
            <DialogDescription>
              Select a candidate to start an automated AI screening interview.
              {eligibleForAIInterview.length === 0
                ? " No eligible candidates — move applications to Interview or Technical stage first."
                : ` ${eligibleForAIInterview.length} eligible candidate(s) at Interview/Technical stage.`}
            </DialogDescription>
          </DialogHeader>
          {eligibleForAIInterview.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Application</Label>
                <Select value={selectedAppForAI} onValueChange={setSelectedAppForAI}>
                  <SelectTrigger><SelectValue placeholder="Choose a candidate" /></SelectTrigger>
                  <SelectContent>
                    {eligibleForAIInterview.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {getCandidateName(app)} — {app.requisition?.job_title || "Unknown Job"} ({stageLabels[app.stage] || app.stage})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartAIInterviewOpen(false)}>Cancel</Button>
            <Button
              onClick={handleStartAIInterview}
              disabled={!selectedAppForAI || triggerAIInterview.isPending}
            >
              {triggerAIInterview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Bot className="h-4 w-4 mr-2" />
              Start Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== APPLY TO JOB DIALOG ===== */}
      <Dialog open={isApplyToJobOpen} onOpenChange={setIsApplyToJobOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Candidate to Job</DialogTitle>
            <DialogDescription>
              Select a job to apply this candidate to. They will appear in the Pipeline at the "Applied" stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Requisition *</Label>
              <Select value={applyToJobReqId} onValueChange={setApplyToJobReqId}>
                <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                <SelectContent>
                  {openJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_title} — {job.location_city || job.location_country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyToJobOpen(false)}>Cancel</Button>
            <Button
              onClick={handleApplyToJob}
              disabled={!applyToJobReqId || applyToJob.isPending}
            >
              {applyToJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MAKE OFFER DIALOG ===== */}
      <Dialog open={isMakeOfferOpen} onOpenChange={setIsMakeOfferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-chart-2" />
              Make Offer
            </DialogTitle>
            <DialogDescription>
              Extend a job offer to this candidate. The application will move to the "Offer" stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Salary (AED) *</Label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={offerForm.salary}
                onChange={(e) => setOfferForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={offerForm.startDate}
                onChange={(e) => setOfferForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                placeholder="Additional offer details..."
                value={offerForm.notes}
                onChange={(e) => setOfferForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMakeOfferOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMakeOffer}
              disabled={!offerForm.salary || makeOffer.isPending}
              className="bg-chart-2 hover:bg-chart-2/90 text-white"
            >
              {makeOffer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <DollarSign className="h-4 w-4 mr-2" />
              Extend Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
