import { formatSmartDate } from "@/lib/utils";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useReviewQueue, ReviewQueueItem } from "@/hooks/useReviewQueue";
import { ClipboardList, CheckCircle, XCircle, RotateCcw, AlertTriangle, Clock } from "lucide-react";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  in_review: <ClipboardList className="h-4 w-4 text-blue-500" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
  revision_needed: <RotateCcw className="h-4 w-4 text-orange-500" />,
};

export default function DoctorReviewQueue() {
  const [activeTab, setActiveTab] = useState("all");
  const statusFilter = activeTab === "all" ? undefined : activeTab;
  const { items, stats, isLoading, reviewItem, isReviewing } = useReviewQueue(statusFilter);

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    item: ReviewQueueItem | null;
    action: "approve" | "reject" | "revision_needed";
  }>({ open: false, item: null, action: "approve" });

  const [reviewerName, setReviewerName] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");

  const handleReview = async () => {
    if (!reviewDialog.item) return;
    await reviewItem({
      review_id: reviewDialog.item.id,
      action: reviewDialog.action,
      reviewer_name: reviewerName || "Doctor",
      reviewer_notes: reviewerNotes,
    });
    setReviewDialog({ open: false, item: null, action: "approve" });
    setReviewerName("");
    setReviewerNotes("");
  };

  const openReviewDialog = (item: ReviewQueueItem, action: "approve" | "reject" | "revision_needed") => {
    setReviewDialog({ open: true, item, action });
  };

  const reviewTypeLabels: Record<string, string> = {
    report_review: "Report Review",
    analysis_review: "Analysis Review",
    script_review: "Script Review",
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Review Queue</h1>
        <p className="text-muted-foreground">Review and approve medical analyses and video scripts</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Loading review queue...</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {activeTab === "all" ? "No items in the review queue." : `No ${activeTab} items.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className={item.priority === "urgent" ? "border-red-200" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {statusIcons[item.status] || statusIcons.pending}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.patient_name || "Unknown Patient"}</p>
                          <Badge variant="outline" className="text-xs">
                            {reviewTypeLabels[item.review_type] || item.review_type}
                          </Badge>
                          <Badge className={`text-xs ${priorityColors[item.priority] || priorityColors.normal}`}>
                            {item.priority}
                          </Badge>
                        </div>
                        {item.summary && (
                          <p className="text-sm text-muted-foreground mt-1">{item.summary}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {formatSmartDate(item.created_at)}
                          {item.reviewer_name && ` · Reviewed by: ${item.reviewer_name}`}
                        </p>
                        {item.reviewer_notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Notes: {item.reviewer_notes}</p>
                        )}
                      </div>
                    </div>

                    {item.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openReviewDialog(item, "approve")}
                          disabled={isReviewing}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReviewDialog(item, "revision_needed")}
                          disabled={isReviewing}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Revise
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openReviewDialog(item, "reject")}
                          disabled={isReviewing}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) setReviewDialog({ open: false, item: null, action: "approve" });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve" : reviewDialog.action === "reject" ? "Reject" : "Request Revision"} — {reviewDialog.item?.patient_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reviewer Name</Label>
              <Input
                placeholder="Dr. ..."
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes {reviewDialog.action !== "approve" && "(recommended)"}</Label>
              <Textarea
                placeholder={
                  reviewDialog.action === "reject"
                    ? "Reason for rejection..."
                    : reviewDialog.action === "revision_needed"
                    ? "What needs to be revised..."
                    : "Optional approval notes..."
                }
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, item: null, action: "approve" })}>
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === "reject" ? "destructive" : "default"}
              onClick={handleReview}
              disabled={isReviewing}
            >
              {isReviewing ? "Processing..." : reviewDialog.action === "approve" ? "Confirm Approval" : reviewDialog.action === "reject" ? "Confirm Rejection" : "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
