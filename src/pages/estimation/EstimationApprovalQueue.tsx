/**
 * EstimationApprovalQueue — Phase 7E-B
 * Shows AI-generated takeoff items pending estimator review.
 * Only relevant when projects use ai_assisted or ai_auto mode.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEstimationProjects } from "@/hooks/useEstimationProjects";
import { useEstimationTakeoff } from "@/hooks/useEstimationTakeoff";
import { Bot, CheckCircle2, XCircle, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export default function EstimationApprovalQueue() {
  const { projects } = useEstimationProjects();
  const { tenantId } = useTenant();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  // Only show projects with AI modes
  const aiProjects = useMemo(
    () => projects.filter((p) => p.estimation_mode && p.estimation_mode !== "manual"),
    [projects]
  );

  // Get the project ID for takeoff hook (null = don't fetch)
  const takeoffProjectId = selectedProject !== "all" ? selectedProject : aiProjects[0]?.id || undefined;
  const { items: allItems, isLoading } = useEstimationTakeoff(takeoffProjectId);

  // For "all" mode, we'd need to aggregate — for now show per-project
  // Filter to AI-calculated, unverified items
  const pendingItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.trade?.toLowerCase().includes(searchTerm.toLowerCase());
      // Show items that are not yet verified (AI-generated items to review)
      return !item.is_verified && matchesSearch;
    });
  }, [allItems, searchTerm]);

  // Group by trade
  const grouped = useMemo(() => {
    const groups: Record<string, typeof pendingItems> = {};
    for (const item of pendingItems) {
      const trade = item.trade || "Unknown";
      if (!groups[trade]) groups[trade] = [];
      groups[trade].push(item);
    }
    return groups;
  }, [pendingItems]);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map((i) => i.id)));
    }
  };

  const handleApprove = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("estimation_takeoff_items" as any)
        .update({ is_verified: true } as any)
        .in("id", itemIds);

      if (error) throw error;
      toast.success(`Approved ${itemIds.length} item(s)`);
      setSelectedItems(new Set());
    } catch (err) {
      console.error("Approval failed:", err);
      toast.error("Failed to approve items");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    setProcessing(true);
    try {
      // For rejection, we delete the AI-generated items
      const { error } = await supabase
        .from("estimation_takeoff_items" as any)
        .delete()
        .in("id", itemIds);

      if (error) throw error;
      toast.success(`Rejected and removed ${itemIds.length} item(s)`);
      setSelectedItems(new Set());
    } catch (err) {
      console.error("Rejection failed:", err);
      toast.error("Failed to reject items");
    } finally {
      setProcessing(false);
    }
  };

  if (aiProjects.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" /> AI Approval Queue
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No projects are using AI-Assisted or Autonomous mode. Switch a project's estimation mode to see AI-generated items here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" /> AI Approval Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve AI-generated takeoff items before they are included in estimates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{pendingItems.length} pending</Badge>
          <Badge variant="secondary">{aiProjects.length} AI project(s)</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              {aiProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({p.estimation_mode === "ai_assisted" ? "AI-Assisted" : "Autonomous"})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by material, trade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {pendingItems.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-sm">
            {selectedItems.size > 0 ? `${selectedItems.size} selected` : "Select all"}
          </span>
          {selectedItems.size > 0 && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(Array.from(selectedItems))}
                disabled={processing}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" /> Approve Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(Array.from(selectedItems))}
                disabled={processing}
              >
                <XCircle className="mr-1 h-3 w-3" /> Reject Selected
              </Button>
            </>
          )}
        </div>
      )}

      {/* Items grouped by trade */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading items...</div>
      ) : pendingItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending items to review. All AI-generated items have been approved or no items exist yet.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([trade, items]) => (
          <Card key={trade}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge>{trade}</Badge>
                <span className="text-sm text-muted-foreground font-normal">{items.length} items</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-3 w-8"></th>
                    <th className="p-3 text-left">Material</th>
                    <th className="p-3 text-left">Surface</th>
                    <th className="p-3 text-right">Net SF</th>
                    <th className="p-3 text-right">Waste %</th>
                    <th className="p-3 text-right">Total Qty</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/20">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{item.material_tag || item.material_name || "Unknown"}</div>
                        {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                      </td>
                      <td className="p-3">{item.surface_type || "-"}</td>
                      <td className="p-3 text-right">{item.net_area_sqft?.toLocaleString() || "0"}</td>
                      <td className="p-3 text-right">{item.waste_factor_pct != null ? `${item.waste_factor_pct}%` : "-"}</td>
                      <td className="p-3 text-right">{item.total_quantity_with_waste?.toLocaleString() || "0"}</td>
                      <td className="p-3 text-right">
                        {item.total_material_cost ? `$${item.total_material_cost.toLocaleString()}` : "$0"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove([item.id])}
                            disabled={processing}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject([item.id])}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
