import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Briefcase,
  FileText,
  Sparkles,
  DollarSign,
  Bell,
  ArrowRight,
  CalendarClock,
} from "lucide-react";

interface DashboardCounts {
  clients: number | null;
  jobs: number | null;
  invoices: number | null;
}

const COMING_FEATURES: { icon: typeof Briefcase; title: string; description: string }[] = [
  {
    icon: Briefcase,
    title: "Jobs Pipeline",
    description: "Track all client work with deadlines, statuses, and team assignments.",
  },
  {
    icon: DollarSign,
    title: "Financial Overview",
    description: "Cash position, MRR, top clients, revenue trends — at a glance.",
  },
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Create, send, and track invoices with auto-matching to bank transactions.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "UK-aware reminders (9-6 Mon-Fri, bank holiday safe) via Email/WhatsApp/SMS.",
  },
];

export default function AccountingDashboard() {
  const { authUser } = useAuth();
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [counts, setCounts] = useState<DashboardCounts>({ clients: null, jobs: null, invoices: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    const fetchCount = async (table: string): Promise<number> => {
      const { count, error: qErr } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (qErr) throw qErr;
      return count ?? 0;
    };

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [clients, jobs, invoices] = await Promise.all([
          fetchCount("accounting_clients"),
          fetchCount("accounting_jobs"),
          fetchCount("accounting_invoices"),
        ]);
        if (!cancelled) {
          setCounts({ clients, jobs, invoices });
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load dashboard";
          console.error("[AccountingDashboard] load failed:", err);
          setError(msg);
          toast({ title: "Couldn't load dashboard", description: msg, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, toast]);

  const greetingName =
    authUser?.full_name?.trim() ||
    (authUser?.email ? authUser.email.split("@")[0] : null) ||
    "there";
  const companyName = tenantConfig?.company_name || "your accounting practice";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {greetingName}</h1>
        <p className="text-muted-foreground">
          {companyName} — Phase 1 backend live. Full UI launching May 25, 2026.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Clients"
          count={counts.clients}
          icon={Users}
          description={counts.clients === 1 ? "active accounting client" : "active accounting clients"}
          isLoading={isLoading}
          actionLabel="View all"
          onAction={() => navigate("/accounting/clients")}
        />
        <StatCard
          label="Jobs"
          count={counts.jobs}
          icon={Briefcase}
          description="across the practice pipeline"
          isLoading={isLoading}
          actionLabel="Coming May 25"
          actionDisabled
        />
        <StatCard
          label="Invoices"
          count={counts.invoices}
          icon={FileText}
          description="issued or in flight (GBP)"
          isLoading={isLoading}
          actionLabel="Coming May 25"
          actionDisabled
        />
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">
            Couldn't reach the database: {error}. Try refresh or contact support.
          </CardContent>
        </Card>
      )}

      {/* "Coming May 25" notice */}
      <Card className="border-primary/30 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Other features launching May 25, 2026
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Today's demo shows the AI brain + database + multi-tenant security. The visual workspace pages below are next.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {COMING_FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-4"
              >
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Target go-live: <span className="font-medium text-foreground">Monday, 25 May 2026</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  label: string;
  count: number | null;
  icon: typeof Users;
  description: string;
  isLoading: boolean;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

function StatCard({
  label,
  count,
  icon: Icon,
  description,
  isLoading,
  actionLabel,
  onAction,
  actionDisabled,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <div className="text-3xl font-bold tabular-nums">{count ?? 0}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
        {actionLabel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={actionDisabled || isLoading}
            onClick={onAction}
          >
            {actionLabel}
            {!actionDisabled && <ArrowRight className="ml-1 h-3 w-3" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
