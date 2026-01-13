// ============================================
// FILE: src/pages/Inbox.tsx
// COPY THIS ENTIRE FILE INTO LOVABLE
// ============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Users,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Search,
  RefreshCcw,
  Volume2,
  VolumeX,
  Phone,
  Mail,
  Filter,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const CHANNEL_CONFIG: Record<string, { color: string; bg: string }> = {
  whatsapp: { color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
  instagram: { color: "text-[#E1306C]", bg: "bg-[#E1306C]/10" },
  facebook: { color: "text-[#1877F2]", bg: "bg-[#1877F2]/10" },
  email: { color: "text-[#4285F4]", bg: "bg-[#4285F4]/10" },
  voice: { color: "text-[#F97316]", bg: "bg-[#F97316]/10" },
  web: { color: "text-[#6B7280]", bg: "bg-[#6B7280]/10" },
};

export default function Inbox() {
  // CRITICAL FIX: Get tenantConfig for the UUID
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id; // USE THIS FOR DATABASE!

  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    quickFilter: "all" as "all" | "unread" | "starred" | "recent",
    leadTemperature: "all" as "all" | "hot" | "warm" | "cold",
    leadScoreRange: [0, 100] as [number, number],
    marketingAgency: "all",
    handledBy: "all" as "all" | "ai" | "staff",
    hasAppointment: "all" as "all" | "yes" | "no",
    sortBy: "recent" as "recent" | "oldest" | "score-high" | "score-low" | "name-az",
  });

  // Query customers using UUID
  const {
    data: customers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["inbox-customers", tenantUuid, selectedPlatform],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let query = supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("updated_at", { ascending: false });

      if (selectedPlatform !== "all" && selectedPlatform !== "staff") {
        query = query.eq("source", selectedPlatform);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  // Marketing sources for filter
  const { data: marketingSources = [] } = useQuery({
    queryKey: ["marketing-sources", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase
        .from("customers")
        .select("marketing_source")
        .eq("tenant_id", tenantUuid)
        .not("marketing_source", "is", null);
      return [...new Set(data?.map((d) => d.marketing_source).filter(Boolean))] as string[];
    },
    enabled: !!tenantUuid,
  });

  // Apply filters
  const filteredCustomers = customers
    .filter((c: any) => {
      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        if (
          !(c.name || "").toLowerCase().includes(s) &&
          !(c.phone || "").includes(searchQuery) &&
          !(c.email || "").toLowerCase().includes(s)
        )
          return false;
      }
      if (filters.leadTemperature !== "all" && c.lead_temperature?.toLowerCase() !== filters.leadTemperature)
        return false;
      if (
        c.lead_score != null &&
        (c.lead_score < filters.leadScoreRange[0] || c.lead_score > filters.leadScoreRange[1])
      )
        return false;
      if (filters.handledBy === "ai" && c.assigned_to !== "AI") return false;
      if (filters.handledBy === "staff" && c.assigned_to === "AI") return false;
      if (filters.marketingAgency !== "all" && c.marketing_source !== filters.marketingAgency) return false;
      if (filters.hasAppointment === "yes" && !c.has_appointment) return false;
      if (filters.hasAppointment === "no" && c.has_appointment) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      switch (filters.sortBy) {
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "score-high":
          return (b.lead_score || 0) - (a.lead_score || 0);
        case "score-low":
          return (a.lead_score || 0) - (b.lead_score || 0);
        case "name-az":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });

  const clearFilters = () =>
    setFilters({
      quickFilter: "all",
      leadTemperature: "all",
      leadScoreRange: [0, 100],
      marketingAgency: "all",
      handledBy: "all",
      hasAppointment: "all",
      sortBy: "recent",
    });

  const activeFilterCount =
    (filters.leadTemperature !== "all" ? 1 : 0) +
    (filters.leadScoreRange[0] !== 0 || filters.leadScoreRange[1] !== 100 ? 1 : 0) +
    (filters.marketingAgency !== "all" ? 1 : 0) +
    (filters.handledBy !== "all" ? 1 : 0) +
    (filters.hasAppointment !== "all" ? 1 : 0) +
    (filters.sortBy !== "recent" ? 1 : 0);

  const getInitials = (name: string | null, phone: string | null) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (phone) return phone.slice(-2);
    return "??";
  };

  const platforms = [
    { id: "all", label: "All" },
    { id: "instagram", label: "Instagram" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "facebook", label: "Facebook" },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <nav className="h-14 border-b px-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 p-0">
                {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isCollapsed ? "Show" : "Hide"} conversations</TooltipContent>
          </Tooltip>
          <div>
            <h1 className="text-lg font-bold">{tenantConfig?.company_name || "Inbox"}</h1>
            <p className="text-xs text-muted-foreground">Customer Messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 border-r pr-3">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  selectedPlatform === p.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            variant={selectedPlatform === "staff" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPlatform("staff")}
            className="gap-1.5"
          >
            <Users className="h-3.5 w-3.5" /> Staff
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!isCollapsed && (
          <aside className="w-72 border-r flex flex-col bg-card">
            <div className="p-3 space-y-3 border-b">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Conversations</span>
                <span className="text-muted-foreground">
                  {filteredCustomers.length} of {customers.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", "unread", "starred", "recent"] as const).map((qf) => (
                  <Button
                    key={qf}
                    variant={filters.quickFilter === qf ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setFilters({ ...filters, quickFilter: qf })}
                  >
                    {qf.charAt(0).toUpperCase() + qf.slice(1)}
                  </Button>
                ))}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <Filter className="h-3 w-3" /> Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex justify-between">
                        Advanced Filters
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label>Marketing Agency</Label>
                        <Select
                          value={filters.marketingAgency}
                          onValueChange={(v) => setFilters({ ...filters, marketingAgency: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Sources" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sources</SelectItem>
                            {marketingSources.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Handler Type</Label>
                        <Select
                          value={filters.handledBy}
                          onValueChange={(v: any) => setFilters({ ...filters, handledBy: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="ai">AI</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Lead Temperature</Label>
                        <Select
                          value={filters.leadTemperature}
                          onValueChange={(v: any) => setFilters({ ...filters, leadTemperature: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="hot">🔥 Hot</SelectItem>
                            <SelectItem value="warm">☀️ Warm</SelectItem>
                            <SelectItem value="cold">❄️ Cold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Lead Score</Label>
                          <span className="text-sm text-muted-foreground">
                            {filters.leadScoreRange[0]}-{filters.leadScoreRange[1]}
                          </span>
                        </div>
                        <Slider
                          value={filters.leadScoreRange}
                          onValueChange={(v) => setFilters({ ...filters, leadScoreRange: v as [number, number] })}
                          min={0}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Has Appointment</Label>
                        <Select
                          value={filters.hasAppointment}
                          onValueChange={(v: any) => setFilters({ ...filters, hasAppointment: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Sort By</Label>
                        <Select
                          value={filters.sortBy}
                          onValueChange={(v: any) => setFilters({ ...filters, sortBy: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent">Most Recent</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                            <SelectItem value="score-high">Score High→Low</SelectItem>
                            <SelectItem value="score-low">Score Low→High</SelectItem>
                            <SelectItem value="name-az">Name A→Z</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations</p>
                </div>
              ) : (
                filteredCustomers.map((c: any) => {
                  const cfg = CHANNEL_CONFIG[c.source?.toLowerCase() || "web"] || CHANNEL_CONFIG.web;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={cn(
                        "p-3 border-b cursor-pointer hover:bg-muted/50",
                        selectedCustomerId === c.id && "bg-primary/5 border-l-2 border-l-primary",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(c.name, c.phone)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", cfg.bg)}>
                            <MessageSquare className={cn("h-3 w-3", cfg.color)} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium truncate text-sm">
                              {c.name || c.phone || c.email || "Unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {c.updated_at && formatDistanceToNow(new Date(c.updated_at), { addSuffix: false })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{c.notes || "No message"}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-5 capitalize">
                              {c.source || "web"}
                            </Badge>
                            {c.lead_temperature && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                {c.lead_temperature === "hot" ? "🔥" : c.lead_temperature === "warm" ? "☀️" : "❄️"}
                              </Badge>
                            )}
                            {c.lead_score != null && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                {c.lead_score}
                              </Badge>
                            )}
                            {c.assigned_to === "AI" && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                AI
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col">
          {selectedPlatform === "staff" ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Staff Chat</p>
                <p className="text-sm">Internal team communication</p>
              </div>
            </div>
          ) : selectedCustomerId ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b bg-card">
                <h2 className="font-semibold">
                  {customers.find((c: any) => c.id === selectedCustomerId)?.name || "Customer"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {customers.find((c: any) => c.id === selectedCustomerId)?.phone}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>Messages will appear here</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a conversation</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
