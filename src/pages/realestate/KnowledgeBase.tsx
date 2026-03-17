import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Tag, Globe, BarChart3 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useState, useMemo } from "react";

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  region_code: string;
  key_metrics: Record<string, unknown> | null;
  ai_usage_context: string | null;
  source: string | null;
  is_active: boolean;
}

const categoryColors: Record<string, string> = {
  negotiation: "bg-blue-100 text-blue-800",
  market_knowledge: "bg-green-100 text-green-800",
  compliance: "bg-red-100 text-red-800",
  objection_handling: "bg-amber-100 text-amber-800",
  deal_structuring: "bg-purple-100 text-purple-800",
  client_psychology: "bg-pink-100 text-pink-800",
  off_plan: "bg-indigo-100 text-indigo-800",
  valuation: "bg-teal-100 text-teal-800",
};

export default function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["re_training_knowledge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("re_training_knowledge" as any)
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("title");
      if (error) throw error;
      return (data || []) as unknown as KnowledgeEntry[];
    },
  });

  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))].sort(), [entries]);
  const regions = useMemo(() => [...new Set(entries.map((e) => e.region_code))].sort(), [entries]);
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (regionFilter !== "all" && e.region_code !== regionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [entries, search, categoryFilter, regionFilter]);

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8" /> Knowledge Base
        </h1>
        <p className="text-muted-foreground">Real estate training knowledge for agents and AI assistants</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Regions</p>
            <p className="text-2xl font-bold">{regions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tags</p>
            <p className="text-2xl font-bold">{allTags.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} entries</span>
      </div>

      {/* Tag Cloud */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 30).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => setSearch(tag)}
            >
              <Tag className="h-3 w-3 mr-1" />{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Entries */}
      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading knowledge base...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No entries match your filters
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={categoryColors[entry.category] || "bg-gray-100 text-gray-800"}>
                      {entry.category.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />{entry.region_code.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {entry.content.length > 300 ? entry.content.slice(0, 300) + "..." : entry.content}
                </p>

                {entry.key_metrics && Object.keys(entry.key_metrics).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(entry.key_metrics).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                        <BarChart3 className="h-3 w-3" />
                        <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {entry.ai_usage_context && (
                  <p className="text-xs text-muted-foreground italic">
                    AI Context: {entry.ai_usage_context}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RTLWrapper>
  );
}
