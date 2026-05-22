import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope, Mail, Phone, Award } from "lucide-react";

interface Doctor {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string | null;
  job_title: string | null;
  specialization: string | null;
  email: string | null;
  work_email: string | null;
  phone: string | null;
  mobile: string | null;
  profile_picture_url: string | null;
  certifications: any;
  notes: string | null;
}

function initialsOf(name: string): string {
  if (!name) return "·";
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function ClinicDoctors() {
  const { tenantId } = useTenant();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["clinic_doctors", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees" as any)
        .select("id, first_name, last_name, full_name, job_title, specialization, email, work_email, phone, mobile, profile_picture_url, certifications, notes")
        .eq("tenant_id", tenantId)
        .or("job_title.ilike.*doctor*,job_title.ilike.*physician*,job_title.ilike.*dermatolog*,specialization.not.is.null")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Doctor[];
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Our Doctors</h1>
        <p className="text-muted-foreground">Meet our medical team. Specialties, qualifications and contact info.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No doctors on file yet.</p>
            <p className="text-xs mt-2">Add a team member in HR → Employees with a doctor-flavoured <code>job_title</code> or <code>specialization</code>.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="doctors-grid">
          {doctors.map(d => {
            const displayName = (d.full_name || `${d.first_name || ""} ${d.last_name || ""}`).trim() || "Unnamed";
            const certs = Array.isArray(d.certifications) ? d.certifications : (d.certifications ? [d.certifications] : []);
            return (
              <Card key={d.id} data-testid={`doctor-card-${d.id}`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14">
                      {d.profile_picture_url ? <AvatarImage src={d.profile_picture_url} alt={displayName} /> : null}
                      <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{displayName}</h3>
                      {d.job_title && <p className="text-xs text-muted-foreground truncate">{d.job_title}</p>}
                      {d.specialization && <Badge variant="outline" className="mt-1 text-xs">{d.specialization}</Badge>}
                    </div>
                  </div>
                  {d.notes && <p className="text-xs text-muted-foreground line-clamp-3">{d.notes}</p>}
                  {certs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {certs.slice(0, 4).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]"><Award className="h-2.5 w-2.5 mr-1" />{String(c).slice(0, 28)}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1 pt-2 border-t text-xs">
                    {(d.work_email || d.email) && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3 w-3" /> <span className="truncate">{d.work_email || d.email}</span>
                      </div>
                    )}
                    {(d.mobile || d.phone) && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" /> <span>{d.mobile || d.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
