import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import { Search, Users, Sparkles } from "lucide-react";

interface AccountingClient {
  id: string;
  name: string;
  company_no: string | null;
  vat_number: string | null;
  status: string | null;
  accounting_period_end: string | null;
  contact_email: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  prospect: "outline",
};

function formatPeriodEnd(value: string | null): string {
  if (!value) return "—";
  // ISO date or full timestamp — extract YYYY-MM-DD and format DD MMM YYYY (UK)
  const datePart = value.length >= 10 ? value.slice(0, 10) : value;
  const d = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function AccountingClients() {
  const { tenantId } = useTenant();
  const { toast } = useToast();

  const [clients, setClients] = useState<AccountingClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("accounting_clients")
          .select("id, name, company_no, vat_number, status, accounting_period_end, contact_email")
          .eq("tenant_id", tenantId)
          .order("name");
        if (qErr) throw qErr;
        if (!cancelled) {
          setClients((data ?? []) as AccountingClient[]);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load clients";
          console.error("[AccountingClients] load failed:", err);
          setError(msg);
          toast({ title: "Couldn't load clients", description: msg, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.company_no?.toLowerCase().includes(q) ||
        c.vat_number?.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const handleRowClick = () => {
    toast({
      title: "Coming May 25, 2026",
      description: "Full client detail view (jobs, invoices, payments, communication history) launches with Phase 1 UI.",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${clients.length} ${clients.length === 1 ? "client" : "clients"} on your roster`}
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, CRN, or VAT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            disabled={isLoading || !!error}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company No.</TableHead>
                <TableHead>VAT Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={`skel-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-destructive py-8">
                    Couldn't load clients: {error}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                    {clients.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <span>No clients yet. Your real roster imports during Day 5.</span>
                      </div>
                    ) : (
                      <span>No clients match "{search}". Try a different search term.</span>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const statusKey = (c.status ?? "active").toLowerCase();
                  const variant = STATUS_VARIANT[statusKey] ?? "secondary";
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={handleRowClick}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.company_no || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.vat_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={variant} className="capitalize">
                          {c.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPeriodEnd(c.accounting_period_end)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.contact_email || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer note */}
      <Card className="border-primary/30 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Full client management — launching May 25, 2026
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add new clients, edit details, manage contact preferences, link jobs and invoices, and view per-client 360°
          history — all coming with the Phase 1 UI on Monday, 25 May 2026.
        </CardContent>
      </Card>
    </div>
  );
}
