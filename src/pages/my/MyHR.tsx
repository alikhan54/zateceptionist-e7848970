import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User as UserIcon,
  Clock,
  Calendar,
  DollarSign,
  GraduationCap,
  FileText,
  Star,
  Mail,
  Phone,
  Building,
  Pencil,
  Save,
  X as XIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Lazy-load the punch-in widget so this page stays light when other tabs are
// being used.
const MyAttendanceWidget = lazy(() =>
  import("@/components/hr/MyAttendanceWidget").then((m) => ({ default: m.MyAttendanceWidget }))
);

const ALLOWED_TABS = [
  "profile",
  "attendance",
  "leaves",
  "payslips",
  "training",
  "documents",
  "reviews",
] as const;
type TabKey = (typeof ALLOWED_TABS)[number];

export default function MyHR() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const { user, authUser } = useAuth();
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    (ALLOWED_TABS as readonly string[]).includes(tabParam || "")
      ? (tabParam as TabKey)
      : "profile"
  );

  useEffect(() => {
    if (tabParam && (ALLOWED_TABS as readonly string[]).includes(tabParam)) {
      setActiveTab(tabParam as TabKey);
    }
  }, [tabParam]);

  // Look up this user's employee record. hr_employees.user_id links to
  // auth.users. We fall back to email columns for legacy rows that pre-date
  // the user_id link.
  const { data: employee, isLoading: empLoading, refetch: refetchEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, tenantUuid],
    queryFn: async () => {
      if (!user?.id || !tenantUuid) return null;
      const { data: byUserId } = await supabase
        .from("hr_employees")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("user_id", user.id)
        .maybeSingle();
      if (byUserId) return byUserId;
      const email = (authUser?.email || user.email || "").toLowerCase();
      if (email) {
        const { data: byEmail } = await supabase
          .from("hr_employees")
          .select("*")
          .eq("tenant_id", tenantUuid)
          .or(`company_email.eq.${email},work_email.eq.${email},email.eq.${email}`)
          .maybeSingle();
        if (byEmail) return byEmail;
      }
      return null;
    },
    enabled: !!user?.id && !!tenantUuid,
  });

  const employeeId = employee?.id;

  if (empLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <Card className="max-w-2xl mx-auto mt-12">
        <CardHeader>
          <CardTitle>Welcome — your employee record isn't linked yet</CardTitle>
          <CardDescription>
            Your account ({authUser?.email}) doesn't have an HR profile attached. Ask your HR admin
            to add you to the employee directory and link this email.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const initials = `${(employee.first_name || "")[0] || ""}${(employee.last_name || "")[0] || ""}`.toUpperCase() || "?";
  const fullName =
    employee.full_name ||
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    employee.company_email ||
    "Employee";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <p className="text-muted-foreground">
                {employee.position || "—"}
                {employee.department ? ` · ${employee.department}` : ""}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline">{employee.employment_status || "active"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabKey);
          navigate(`/my/${v}`, { replace: true });
        }}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile" className="gap-1">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Leaves</span>
          </TabsTrigger>
          <TabsTrigger value="payslips" className="gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Payslips</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-1">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Training</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Reviews</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab employee={employee} tenantUuid={tenantUuid} onSaved={() => refetchEmployee()} />
        </TabsContent>

        <TabsContent value="attendance">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            {employeeId && tenantUuid && (
              <MyAttendanceWidget employeeId={employeeId} tenantUuid={tenantUuid} />
            )}
          </Suspense>
          <div className="mt-4">
            <MyAttendanceHistory employeeId={employeeId} tenantUuid={tenantUuid} />
          </div>
        </TabsContent>

        <TabsContent value="leaves">
          <MyLeavesTab employeeId={employeeId} tenantUuid={tenantUuid} />
        </TabsContent>

        <TabsContent value="payslips">
          <MyPayslipsTab employeeId={employeeId} tenantUuid={tenantUuid} />
        </TabsContent>

        <TabsContent value="training">
          <MyTrainingTab employeeId={employeeId} tenantUuid={tenantUuid} />
        </TabsContent>

        <TabsContent value="documents">
          <MyDocumentsTab employeeId={employeeId} tenantUuid={tenantUuid} />
        </TabsContent>

        <TabsContent value="reviews">
          <MyReviewsTab employeeId={employeeId} tenantUuid={tenantUuid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Editable Profile tab.
 *
 * Edit allowlist (staff can change these for themselves):
 *   phone, personal_email, address, city, country,
 *   emergency_contact_*, linkedin_url, bio, marital_status, profile_picture_url
 *
 * Read-only here (HR-managed):
 *   first_name, last_name, company_email, position, department, salary,
 *   date_of_joining, employment_status, visa_*, manager_id
 */
function ProfileTab({ employee, tenantUuid, onSaved }: { employee: any; tenantUuid?: string; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = () => ({
    phone: employee?.phone || "",
    personal_email: employee?.personal_email || "",
    address: employee?.address || employee?.address_line1 || "",
    city: employee?.city || "",
    country: employee?.country || "",
    emergency_contact_name: employee?.emergency_contact_name || "",
    emergency_contact_phone: employee?.emergency_contact_phone || "",
    emergency_contact_relationship: employee?.emergency_contact_relationship || "",
    linkedin_url: employee?.linkedin_url || "",
    bio: employee?.bio || "",
    marital_status: employee?.marital_status || "",
    profile_picture_url: employee?.profile_picture_url || "",
  });
  const [form, setForm] = useState(initial);

  useEffect(() => { setForm(initial()); }, [employee?.id]);

  const handleSave = async () => {
    if (!employee?.id || !tenantUuid) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("hr_employees")
        .update(form as any)
        .eq("id", employee.id)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
      toast.success("Profile updated");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["my-employee"] });
      onSaved?.();
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  const ro = (label: string, value: any, Icon: any = UserIcon) => (
    <div className="flex items-start gap-3 p-3 rounded border bg-muted/20">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>
              You can update contact info and emergency contacts. For role / salary / official
              details, contact HR.
            </CardDescription>
          </div>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)} data-testid="profile-edit-btn">
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>
                <XIcon className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} data-testid="profile-save-btn">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Official Information (contact HR to update)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ro("Full Name", `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.full_name, UserIcon)}
            {ro("Position", employee.position || employee.job_title, Building)}
            {ro("Department", employee.department, Building)}
            {ro("Company Email", employee.company_email || employee.work_email || employee.email, Mail)}
            {ro("Date of Joining", employee.date_of_joining ? format(new Date(employee.date_of_joining), "PPP") : "", Calendar)}
            {ro("Employment Status", employee.employment_status, UserIcon)}
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Contact Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} editing={editMode} icon={Phone} />
            <Field label="Personal Email" type="email" value={form.personal_email} onChange={(v) => setForm({ ...form, personal_email: v })} editing={editMode} icon={Mail} />
            <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} editing={editMode} multiline />
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} editing={editMode} />
            <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} editing={editMode} />
            <Field label="LinkedIn URL" type="url" value={form.linkedin_url} onChange={(v) => setForm({ ...form, linkedin_url: v })} editing={editMode} />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Emergency Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Name" value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} editing={editMode} />
            <Field label="Phone" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} editing={editMode} />
            <Field label="Relationship" value={form.emergency_contact_relationship} onChange={(v) => setForm({ ...form, emergency_contact_relationship: v })} editing={editMode} />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Personal</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Field label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} editing={editMode} multiline />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Marital Status</Label>
              {editMode ? (
                <Select value={form.marital_status || ""} onValueChange={(v) => setForm({ ...form, marital_status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium mt-1">{form.marital_status || "—"}</p>
              )}
            </div>
            <Field label="Profile Picture URL" type="url" value={form.profile_picture_url} onChange={(v) => setForm({ ...form, profile_picture_url: v })} editing={editMode} />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, editing, multiline, type = "text", icon: Icon }: { label: string; value: string; onChange: (v: string) => void; editing: boolean; multiline?: boolean; type?: string; icon?: any; }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </Label>
      {editing ? (
        multiline ? (
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" rows={2} />
        ) : (
          <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
        )
      ) : (
        <p className="font-medium mt-1 break-words">{value || "—"}</p>
      )}
    </div>
  );
}

function MyAttendanceHistory({ employeeId, tenantUuid }: { employeeId?: string; tenantUuid?: string }) {
  const { data: records } = useQuery({
    queryKey: ["my-attendance-history", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_attendance")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId)
        .order("work_date", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        {!records || records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No records yet</p>
        ) : (
          <div className="space-y-1">
            {records.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
                <span>{r.work_date}</span>
                <span className="text-muted-foreground">
                  {r.check_in_time ? format(new Date(r.check_in_time), "h:mm a") : "—"}
                  {" → "}
                  {r.check_out_time ? format(new Date(r.check_out_time), "h:mm a") : "still in"}
                </span>
                <Badge variant="outline" className="text-xs">
                  {r.work_hours ? `${r.work_hours}h` : (r.total_hours ? `${r.total_hours}h` : "—")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyLeavesTab({ employeeId, tenantUuid }: { employeeId?: string; tenantUuid?: string }) {
  const { data: balance } = useQuery({
    queryKey: ["my-leave-balance", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_leave_balances")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId);
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  const { data: requests } = useQuery({
    queryKey: ["my-leave-requests", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_leave_requests")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          {!balance || balance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No balance configured</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balance.map((b: any) => (
                <div key={b.id} className="p-3 rounded border">
                  <p className="text-xs text-muted-foreground">{b.leave_type_name || b.leave_type_id}</p>
                  <p className="text-xl font-bold">
                    {(b.total_entitled || 0) - (b.used || 0) - (b.pending || 0)}
                    <span className="text-sm font-normal text-muted-foreground"> / {b.total_entitled || 0}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border-b last:border-b-0 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {r.leave_type_id || r.leave_type} · {r.start_date} → {r.end_date}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.reason || ""}</p>
                  </div>
                  <Badge variant="outline">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MyPayslipsTab({ employeeId, tenantUuid }: { employeeId?: string; tenantUuid?: string }) {
  const { data } = useQuery({
    queryKey: ["my-payslips", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_payroll")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(24);
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Payslips</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payslips available</p>
        ) : (
          <div className="space-y-1">
            {data.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border-b last:border-b-0 py-2 text-sm">
                <span>{p.period || p.pay_period || p.month || "—"}</span>
                <span className="font-mono">
                  {p.net_pay
                    ? `${p.currency || "AED"} ${Number(p.net_pay).toLocaleString()}`
                    : "—"}
                </span>
                <Badge variant="outline">{p.status || "—"}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyTrainingTab({ employeeId, tenantUuid }: { employeeId?: string; tenantUuid?: string }) {
  const { data } = useQuery({
    queryKey: ["my-training", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_training_enrollments")
        .select("*, training:hr_trainings(*)")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId);
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Training</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No training assigned</p>
        ) : (
          <div className="space-y-2">
            {data.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between border-b last:border-b-0 py-2">
                <div>
                  <p className="text-sm font-medium">{t.training?.title || t.training?.name || "Training"}</p>
                  <p className="text-xs text-muted-foreground">{t.training?.description || ""}</p>
                </div>
                <Badge variant="outline">{t.status || "—"}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyDocumentsTab({ employeeId, tenantUuid }: { employeeId?: string; tenantUuid?: string }) {
  const { data } = useQuery({
    queryKey: ["my-documents", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_documents")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Documents</CardTitle>
        <CardDescription>Personal documents like contracts, NDAs, signed offers.</CardDescription>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No personal documents</p>
        ) : (
          <div className="space-y-1">
            {data.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between border-b last:border-b-0 py-2 text-sm">
                <span>{d.document_name || d.title}</span>
                <span className="text-muted-foreground text-xs">{d.document_type || d.category}</span>
                {d.file_url ? (
                  <a className="text-primary underline" href={d.file_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">no file</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyReviewsTab({ employeeId, tenantUuid }: { employeeId?: string; tenantUuid?: string }) {
  const { data } = useQuery({
    queryKey: ["my-reviews", employeeId, tenantUuid],
    queryFn: async () => {
      if (!employeeId || !tenantUuid) return [];
      const { data } = await supabase
        .from("hr_performance_reviews")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId)
        .order("review_date", { ascending: false });
      return data || [];
    },
    enabled: !!employeeId && !!tenantUuid,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Performance Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((r: any) => (
              <div key={r.id} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{r.review_period || r.period || "Review"}</p>
                  <Badge variant="outline">{r.overall_rating || r.rating || "—"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.summary || r.comments || ""}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
