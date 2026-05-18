import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useClinicPatient } from "@/hooks/useClinicPatient";
import {
  ArrowLeft, Phone, Mail, Cake, User, Stethoscope, Activity,
  Heart, AlertCircle, Calendar, FileText, Star, Sparkles,
  ClipboardList, Image as ImageIcon, MessageSquare, Pencil,
  ChevronRight, ShieldCheck, BookOpen,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function initialsOf(name: string): string {
  if (!name) return "·";
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function tierColor(tier: string): string {
  const t = (tier || "").toLowerCase();
  if (t === "vip") return "bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (t === "gold") return "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30";
  if (t === "silver") return "bg-gradient-to-br from-slate-400/20 to-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30";
  return "bg-muted text-muted-foreground border-border";
}

function planText(plan: any): string {
  if (!plan) return "";
  if (typeof plan === "string") return plan;
  if (typeof plan === "object") return plan.notes || plan.text || JSON.stringify(plan);
  return String(plan);
}

export default function PatientProfile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useClinicPatient(patientId);

  const patient = data?.patient;
  const consultations = data?.consultations ?? [];
  const appointments = data?.appointments ?? [];
  const prescriptions = data?.prescriptions ?? [];
  const healthAnalyses = data?.healthAnalyses ?? [];

  const age = useMemo(() => calcAge(patient?.date_of_birth ?? null), [patient?.date_of_birth]);
  const upcomingAppt = useMemo(
    () => appointments.find(a => a.scheduled_at && new Date(a.scheduled_at) > new Date()),
    [appointments]
  );

  // Build a unified timeline (consultations + appointments + health analyses)
  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      type: "consultation" | "appointment" | "analysis" | "prescription";
      date: string;
      title: string;
      body?: string;
      meta?: string;
      icon: React.ReactNode;
      accent: string;
    }> = [];
    consultations.forEach(c => items.push({
      id: c.id,
      type: "consultation",
      date: c.created_at,
      title: c.diagnosis || c.chief_complaint || "Consultation",
      body: planText(c.treatment_plan),
      meta: c.practitioner_name ? `with ${c.practitioner_name}` : undefined,
      icon: <Stethoscope className="h-4 w-4" />,
      accent: "from-purple-500/20 to-violet-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    }));
    appointments.forEach(a => items.push({
      id: a.id,
      type: "appointment",
      date: a.scheduled_at || a.created_at,
      title: a.service || "Appointment",
      body: a.notes || undefined,
      meta: a.status || undefined,
      icon: <Calendar className="h-4 w-4" />,
      accent: "from-sky-500/20 to-blue-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    }));
    healthAnalyses.forEach(h => items.push({
      id: h.id,
      type: "analysis",
      date: h.created_at,
      title: `Health analysis · score ${h.overall_health_score ?? "—"}`,
      body: typeof h.recommendations === "string" ? h.recommendations : undefined,
      icon: <Activity className="h-4 w-4" />,
      accent: "from-emerald-500/20 to-green-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    }));
    prescriptions.forEach(p => items.push({
      id: p.id,
      type: "prescription",
      date: p.issued_at || p.created_at,
      title: p.medication_name || "Prescription",
      body: [p.dosage, p.frequency].filter(Boolean).join(" · "),
      icon: <FileText className="h-4 w-4" />,
      accent: "from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    }));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [consultations, appointments, healthAnalyses, prescriptions]);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // ── Not found / RLS-blocked ──
  if (!patient) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clinic/patients")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to patients
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Patient not found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This patient either doesn't exist, was archived, or belongs to a different tenant.
              If you believe you should have access, contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Hero + stats + tabs ──
  const allergyList: string[] = Array.isArray(patient.allergies) ? patient.allergies as string[] : [];
  const showAllergyAlert = allergyList.length > 0 && allergyList[0] !== "None known";
  const tagList = patient.tags || [];

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      {/* Back navigation */}
      <Link to="/clinic/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Patients
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-foreground font-medium">{patient.full_name}</span>
      </Link>

      {/* Hero card */}
      <Card className="overflow-hidden border-2">
        <div className="relative bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/10 dark:from-purple-500/15 dark:via-pink-500/8 dark:to-amber-500/15">
          <CardContent className="pt-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {initialsOf(patient.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight">{patient.full_name}</h1>
                  <Badge variant="outline" className={tierColor(patient.loyalty_tier)}>
                    <Star className="h-3 w-3 mr-1" />
                    {patient.loyalty_tier || "New"}
                  </Badge>
                  {showAllergyAlert && (
                    <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Allergies
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  {age !== null && (
                    <span className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5" />{age} years old</span>
                  )}
                  {patient.gender && (
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{patient.gender}</span>
                  )}
                  {patient.phone && (
                    <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Phone className="h-3.5 w-3.5" />{patient.phone}
                    </a>
                  )}
                  {patient.email && (
                    <a href={`mailto:${patient.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate">
                      <Mail className="h-3.5 w-3.5" />{patient.email}
                    </a>
                  )}
                </div>

                {(tagList.length > 0 || patient.skin_type) && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {patient.skin_type && (
                      <Badge variant="secondary" className="text-xs capitalize">{patient.skin_type} skin</Badge>
                    )}
                    {patient.fitzpatrick_type && (
                      <Badge variant="secondary" className="text-xs">Fitzpatrick {patient.fitzpatrick_type}</Badge>
                    )}
                    {tagList.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="default" size="sm">
                  <Calendar className="h-4 w-4 mr-1.5" /> Book
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1.5" /> Report
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Message
                </Button>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
              </div>
            </div>

            {/* Allergy banner */}
            {showAllergyAlert && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm">
                <Heart className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                <div className="text-red-700 dark:text-red-300">
                  <span className="font-medium">Allergies on file:</span>{" "}
                  <span className="opacity-90">{allergyList.join(", ")}</span>
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatBlock
          label="Consultations"
          value={consultations.length}
          icon={<Stethoscope className="h-4 w-4 text-purple-500" />}
        />
        <StatBlock
          label="Total Visits"
          value={patient.total_visits || 0}
          icon={<Activity className="h-4 w-4 text-blue-500" />}
        />
        <StatBlock
          label="Lifetime Value"
          value={`AED ${(patient.total_spent || 0).toLocaleString()}`}
          icon={<Sparkles className="h-4 w-4 text-amber-500" />}
        />
        <StatBlock
          label="Loyalty Points"
          value={patient.loyalty_points || 0}
          icon={<Star className="h-4 w-4 text-yellow-500" />}
        />
        <StatBlock
          label="Next Appointment"
          value={upcomingAppt?.scheduled_at ? formatDate(upcomingAppt.scheduled_at, "medium") : "—"}
          icon={<Calendar className="h-4 w-4 text-emerald-500" />}
          small
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="timeline"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Timeline</TabsTrigger>
          <TabsTrigger value="treatments"><Stethoscope className="h-3.5 w-3.5 mr-1.5" />Care</TabsTrigger>
          <TabsTrigger value="photos"><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Photos</TabsTrigger>
          <TabsTrigger value="files"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Files</TabsTrigger>
          <TabsTrigger value="notes"><Pencil className="h-3.5 w-3.5 mr-1.5" />Notes</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-3">
          {timeline.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              title="No history yet"
              body="Once you log consultations or schedule appointments, they'll appear here in chronological order."
              cta="Schedule first consultation"
            />
          ) : (
            <div className="relative pl-6 border-l-2 border-dashed border-border space-y-4">
              {timeline.map((item) => (
                <div key={`${item.type}-${item.id}`} className="relative">
                  <div className={`absolute -left-[34px] top-1.5 h-6 w-6 rounded-full bg-gradient-to-br ${item.accent} border-2 flex items-center justify-center`}>
                    {item.icon}
                  </div>
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.date, "medium")}</span>
                      </div>
                      {item.body && <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>}
                      {item.meta && <p className="text-xs text-muted-foreground mt-1.5 capitalize">{item.meta}</p>}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Care (consultations + prescriptions) */}
        <TabsContent value="treatments" className="space-y-3">
          {consultations.length === 0 && prescriptions.length === 0 ? (
            <EmptyState
              icon={<Stethoscope className="h-10 w-10" />}
              title="No clinical records"
              body="Consultations and prescriptions for this patient will show up here."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-purple-500" />
                    Consultations <span className="text-muted-foreground font-normal">({consultations.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {consultations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None yet.</p>
                  ) : consultations.slice(0, 8).map(c => (
                    <div key={c.id} className="text-sm border-l-2 border-purple-500/40 pl-3 py-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.diagnosis || c.chief_complaint || "Consultation"}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(c.created_at, "short")}</span>
                      </div>
                      {c.practitioner_name && (
                        <span className="text-xs text-muted-foreground">{c.practitioner_name}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    Prescriptions <span className="text-muted-foreground font-normal">({prescriptions.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {prescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No prescriptions on file.</p>
                  ) : prescriptions.slice(0, 8).map(p => (
                    <div key={p.id} className="text-sm border-l-2 border-amber-500/40 pl-3 py-0.5">
                      <div className="font-medium">{p.medication_name || "Medication"}</div>
                      <div className="text-xs text-muted-foreground">{[p.dosage, p.frequency].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos">
          <EmptyState
            icon={<ImageIcon className="h-10 w-10" />}
            title="No progress photos yet"
            body="Before / after photos uploaded during consultations will appear here."
          />
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="No files uploaded"
            body="Medical reports, lab results, and other documents will appear here once uploaded."
          />
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" /> Practitioner notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.notes ? (
                <p className="text-sm whitespace-pre-line leading-relaxed">{patient.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes recorded for this patient.</p>
              )}
            </CardContent>
          </Card>
          {(patient.preferred_practitioner || patient.preferred_contact) && (
            <>
              <Separator className="my-4" />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Preferences & consent
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                  {patient.preferred_practitioner && (
                    <div>
                      <div className="text-xs text-muted-foreground">Preferred practitioner</div>
                      <div className="font-medium">{patient.preferred_practitioner}</div>
                    </div>
                  )}
                  {patient.preferred_contact && (
                    <div>
                      <div className="text-xs text-muted-foreground">Preferred contact</div>
                      <div className="font-medium capitalize">{patient.preferred_contact}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Photo consent</div>
                    <div className="font-medium">{patient.photo_consent ? "Granted" : "Not on file"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Marketing consent</div>
                    <div className="font-medium">{patient.marketing_consent ? "Granted" : "Not on file"}</div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatBlock({ label, value, icon, small }: { label: string; value: string | number; icon: React.ReactNode; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className={small ? "text-base font-semibold" : "text-2xl font-bold tracking-tight"}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta?: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 text-muted-foreground opacity-60 inline-block">{icon}</div>
        <h3 className="font-semibold mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{body}</p>
        {cta && (
          <Button variant="outline" size="sm" className="mt-4">{cta}</Button>
        )}
      </CardContent>
    </Card>
  );
}
