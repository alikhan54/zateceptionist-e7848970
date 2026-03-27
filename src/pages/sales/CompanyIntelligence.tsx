import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/webhook";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, Globe, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CompanyIntel {
  id: string;
  company_name: string;
  company_domain: string;
  intelligence_score: number;
  tech_stack: string[];
  products_services: string[];
  social_links: Record<string, string>;
  emails_on_website: string[];
  heat_score: number;
  heat_level: string;
  data_sources: string[];
  website_summary?: string;
}

const HEAT_COLORS: Record<string, string> = {
  on_fire: "bg-red-500/20 text-red-400", hot: "bg-orange-500/20 text-orange-400",
  warm: "bg-yellow-500/20 text-yellow-400", cool: "bg-blue-500/20 text-blue-400", cold: "bg-gray-500/20 text-gray-400",
};

export default function CompanyIntelligence() {
  const { tenantId } = useTenant();
  const [searchQ, setSearchQ] = useState("");
  const [researchingDomain, setResearchingDomain] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["company_intelligence", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("company_intelligence").select("*").eq("tenant_id", tenantId).order("intelligence_score", { ascending: false });
      if (error) throw error;
      return (data || []) as CompanyIntel[];
    },
    enabled: !!tenantId,
  });

  const filtered = companies.filter(c => !searchQ || c.company_name?.toLowerCase().includes(searchQ.toLowerCase()));

  const handleResearch = async (domain: string, name: string) => {
    setResearchingDomain(domain);
    try {
      const r = await callWebhook("/research-company", { tenant_id: tenantId, website: "https://" + domain, company_name: name }, tenantId);
      toast.success(r?.success ? `Researched: ${(r as any).completeness}% complete` : "Research queued");
    } catch { toast.error("Research failed"); }
    setResearchingDomain(null);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="h-8 w-8" /> Company Intelligence</h1>
        <p className="text-muted-foreground mt-1">Aggregated intelligence from all data sources</p></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{companies.length}</div><div className="text-xs text-muted-foreground">Companies Profiled</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-400">{companies.filter(c => c.intelligence_score >= 50).length}</div><div className="text-xs text-muted-foreground">High Intel (50+)</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{Math.round(companies.reduce((s, c) => s + c.intelligence_score, 0) / (companies.length || 1))}</div><div className="text-xs text-muted-foreground">Avg Intel Score</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Search companies..." value={searchQ} onChange={e => setSearchQ(e.target.value)} /></div>

      <div className="grid gap-4">
        {filtered.map(c => (
          <Card key={c.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{c.company_name}</h3>
                    <Badge variant="outline" className="text-xs">{c.company_domain}</Badge>
                    {c.heat_level && <Badge className={HEAT_COLORS[c.heat_level] || ""}>{c.heat_level}</Badge>}
                  </div>
                  {c.website_summary && <p className="text-sm text-muted-foreground line-clamp-2">{c.website_summary}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><div className="text-2xl font-bold">{c.intelligence_score}</div><div className="text-xs text-muted-foreground">Intel Score</div></div>
                  <Button variant="outline" size="sm" onClick={() => handleResearch(c.company_domain, c.company_name)} disabled={researchingDomain === c.company_domain}>
                    {researchingDomain === c.company_domain ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {c.tech_stack?.map((t, i) => <Badge key={i} variant="outline" className="text-xs bg-purple-500/10 text-purple-400">{t}</Badge>)}
                {c.products_services?.map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {c.emails_on_website?.length > 0 && <span>Emails: {c.emails_on_website.length}</span>}
                {Object.keys(c.social_links || {}).length > 0 && <span>Social: {Object.keys(c.social_links).join(", ")}</span>}
                <span>Sources: {c.data_sources?.join(", ")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
