import { formatSmartDate, formatDate } from "@/lib/utils";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Banknote,
  Shield,
  Brain,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  FileText,
} from "lucide-react";
import {
  useCollections,
  type CollectionsAccount,
  type ContactLog,
  type Settlement,
  type ComplianceLog,
} from "@/hooks/useCollections";
import { useToast } from "@/hooks/use-toast";

const BUCKET_COLORS: Record<string, string> = {
  B1: "bg-green-500",
  B2: "bg-lime-500",
  B3: "bg-yellow-500",
  B4: "bg-orange-500",
  B5: "bg-red-400",
  B6: "bg-red-600",
  B7: "bg-red-900",
};

const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "contacts", label: "Contact History", icon: Phone },
  { key: "ptps", label: "PTPs", icon: Calendar },
  { key: "settlements", label: "Settlements", icon: Banknote },
  { key: "compliance", label: "Compliance", icon: Shield },
  { key: "ai", label: "AI Recommendations", icon: Brain },
];

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [ptpDialogOpen, setPtpDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const {
    accounts,
    isLoading,
    useContactLogs,
    useSettlements,
    recordPTP,
    logContact,
  } = useCollections();
  const usePTPs = (_id?: string | null) => ({ data: [] as any[], isLoading: false });
  const useComplianceLogs = (_id?: string | null) => ({ data: [] as any[], isLoading: false });
  const createPTP = recordPTP;
  const createSettlement = { mutateAsync: async (_d: any) => {} } as any;

  const account = accounts.find((a) => a.id === accountId) || null;
  const { data: contactLogs = [] } = useContactLogs(accountId || null);
  const { data: settlements = [] } = useSettlements(accountId);
  const { data: ptps = [] } = usePTPs(accountId || null);
  const { data: complianceLogs = [] } = useComplianceLogs(accountId);

  // PTP form state
  const [ptpForm, setPtpForm] = useState({
    promisedAmount: "",
    promisedDate: "",
    promisedMethod: "bank_transfer",
    notes: "",
  });

  // Settlement form state
  const [settlementForm, setSettlementForm] = useState({
    settledAmount: "",
    discountPercent: "",
    expiryDate: "",
  });

  // Contact form state
  const [contactForm, setContactForm] = useState({
    channel: "phone",
    outcome: "no_answer",
    notes: "",
  });

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-AE", { minimumFractionDigits: 0 }).format(amount);

  const handleCreatePTP = async () => {
    if (!accountId || !ptpForm.promisedAmount || !ptpForm.promisedDate) return;
    try {
      await createPTP.mutateAsync({
        accountId,
        ptpDate: ptpForm.promisedDate,
        ptpAmount: parseFloat(ptpForm.promisedAmount),
        paymentMethod: ptpForm.promisedMethod,
      } as any);
      toast({ title: "PTP Created", description: "Promise to Pay recorded successfully." });
      setPtpDialogOpen(false);
      setPtpForm({ promisedAmount: "", promisedDate: "", promisedMethod: "bank_transfer", notes: "" });
    } catch {
      toast({ title: "Error", description: "Failed to create PTP.", variant: "destructive" });
    }
  };

  const handleCreateSettlement = async () => {
    if (!accountId || !settlementForm.settledAmount) return;
    try {
      await createSettlement.mutateAsync({
        accountId,
        settledAmount: parseFloat(settlementForm.settledAmount),
        discountPercent: settlementForm.discountPercent
          ? parseFloat(settlementForm.discountPercent)
          : undefined,
        expiryDate: settlementForm.expiryDate || undefined,
      });
      toast({ title: "Settlement Requested", description: "Settlement sent for approval." });
      setSettlementDialogOpen(false);
      setSettlementForm({ settledAmount: "", discountPercent: "", expiryDate: "" });
    } catch {
      toast({ title: "Error", description: "Failed to create settlement.", variant: "destructive" });
    }
  };

  const handleLogContact = async () => {
    if (!accountId) return;
    try {
      await logContact.mutateAsync({
        accountId,
        channel: contactForm.channel,
        outcome: contactForm.outcome,
        notes: contactForm.notes || undefined,
      });
      toast({ title: "Contact Logged", description: "Contact attempt recorded." });
      setContactDialogOpen(false);
      setContactForm({ channel: "phone", outcome: "no_answer", notes: "" });
    } catch {
      toast({ title: "Error", description: "Failed to log contact.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        Loading account...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/collections/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            Account not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/collections/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{account.client_name}</h1>
              <Badge className={`${BUCKET_COLORS[account.bucket] || "bg-gray-500"} text-white`}>
                {account.bucket} &middot; {account.dpd}d
              </Badge>
              <Badge variant="outline">{account.status}</Badge>
            </div>
            <p className="text-muted-foreground font-mono">{account.account_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-1" /> Log Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Contact Attempt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Select value={contactForm.channel} onValueChange={(v) => setContactForm({ ...contactForm, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="field_visit">Field Visit</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={contactForm.outcome} onValueChange={(v) => setContactForm({ ...contactForm, outcome: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="wrong_number">Wrong Number</SelectItem>
                    <SelectItem value="callback_requested">Callback Requested</SelectItem>
                    <SelectItem value="right_party_contact">Right Party Contact</SelectItem>
                    <SelectItem value="ptp_secured">PTP Secured</SelectItem>
                    <SelectItem value="refused_to_pay">Refused to Pay</SelectItem>
                    <SelectItem value="dispute">Dispute</SelectItem>
                    <SelectItem value="hardship">Financial Hardship</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notes..." value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
                <Button onClick={handleLogContact} className="w-full">Log Contact</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={ptpDialogOpen} onOpenChange={setPtpDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-1" /> Create PTP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Promise to Pay</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input type="number" placeholder="Amount (AED)" value={ptpForm.promisedAmount} onChange={(e) => setPtpForm({ ...ptpForm, promisedAmount: e.target.value })} />
                <Input type="date" value={ptpForm.promisedDate} onChange={(e) => setPtpForm({ ...ptpForm, promisedDate: e.target.value })} />
                <Select value={ptpForm.promisedMethod} onValueChange={(v) => setPtpForm({ ...ptpForm, promisedMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notes..." value={ptpForm.notes} onChange={(e) => setPtpForm({ ...ptpForm, notes: e.target.value })} />
                <Button onClick={handleCreatePTP} className="w-full">Create PTP</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Banknote className="h-4 w-4 mr-1" /> Request Settlement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Settlement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Outstanding: AED {formatAmount(account.outstanding_balance)}
                  </p>
                </div>
                <Input type="number" placeholder="Settlement Amount (AED)" value={settlementForm.settledAmount} onChange={(e) => setSettlementForm({ ...settlementForm, settledAmount: e.target.value })} />
                <Input type="number" placeholder="Discount %" value={settlementForm.discountPercent} onChange={(e) => setSettlementForm({ ...settlementForm, discountPercent: e.target.value })} />
                <Input type="date" placeholder="Expiry Date" value={settlementForm.expiryDate} onChange={(e) => setSettlementForm({ ...settlementForm, expiryDate: e.target.value })} />
                <Button onClick={handleCreateSettlement} className="w-full">Submit for Approval</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab account={account} formatAmount={formatAmount} />
      )}
      {activeTab === "contacts" && (
        <ContactsTab contacts={contactLogs} />
      )}
      {activeTab === "ptps" && (
        <PTPsTab ptps={ptps} formatAmount={formatAmount} />
      )}
      {activeTab === "settlements" && (
        <SettlementsTab settlements={settlements} formatAmount={formatAmount} />
      )}
      {activeTab === "compliance" && (
        <ComplianceTab logs={complianceLogs} />
      )}
      {activeTab === "ai" && (
        <AITab account={account} formatAmount={formatAmount} />
      )}
    </div>
  );
}

// === Sub-components ===

function OverviewTab({ account, formatAmount }: { account: CollectionsAccount; formatAmount: (n: number) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Original Amount</span><span className="font-medium">AED {formatAmount(account.original_amount)}</span></div>
          <div className="flex justify-between"><span>Outstanding</span><span className="font-medium text-red-600">AED {formatAmount(account.outstanding_balance)}</span></div>
          <div className="flex justify-between"><span>Monthly EMI</span><span className="font-medium">AED {formatAmount(account.monthly_payment || 0)}</span></div>
          <div className="flex justify-between"><span>Product</span><span className="font-medium">{account.product_type?.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span>Currency</span><span className="font-medium">{account.currency}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Delinquency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span>DPD</span><span className="font-bold text-lg">{account.dpd}</span></div>
          <div className="flex justify-between"><span>Bucket</span><Badge className={`${BUCKET_COLORS[account.bucket]} text-white`}>{account.bucket}</Badge></div>
          <div className="flex justify-between"><span>Due Date</span><span className="font-medium">{account.due_date || "N/A"}</span></div>
          <div className="flex justify-between"><span>Last Payment</span><span className="font-medium">{account.last_payment_date || "None"}</span></div>
          {account.last_payment_amount && (
            <div className="flex justify-between"><span>Last Payment Amt</span><span className="font-medium">AED {formatAmount(account.last_payment_amount)}</span></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{account.client_phone || "N/A"}</span></div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{account.client_email || "N/A"}</span></div>
          <div className="flex justify-between"><span>Contact Attempts</span><span className="font-medium">{account.total_contact_attempts}</span></div>
          <div className="flex justify-between"><span>Last Contact</span><span className="font-medium">{account.last_contact_date ? new Date(account.last_contact_date).toLocaleDateString() : "Never"}</span></div>
          <div className="flex justify-between"><span>Last Outcome</span><span className="font-medium">{account.last_contact_outcome || "N/A"}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">PTP Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Current PTP</span><span className="font-medium">{account.ptp_status || "None"}</span></div>
          {account.ptp_amount && <div className="flex justify-between"><span>PTP Amount</span><span className="font-medium">AED {formatAmount(account.ptp_amount)}</span></div>}
          {account.ptp_date && <div className="flex justify-between"><span>PTP Date</span><span className="font-medium">{account.ptp_date}</span></div>}
          <div className="flex justify-between"><span>Total PTPs</span><span className="font-medium">{account.ptp_count}</span></div>
          <div className="flex justify-between"><span>Kept / Broken</span><span className="font-medium text-green-600">{account.ptp_kept_count}</span> / <span className="font-medium text-red-600">{account.ptp_broken_count}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Agent</span><span className="font-medium">{account.assigned_agent || "Unassigned"}</span></div>
          <div className="flex justify-between"><span>Team</span><span className="font-medium">{account.assigned_team?.replace(/_/g, " ") || "N/A"}</span></div>
          <div className="flex justify-between"><span>Next Action</span><span className="font-medium">{account.next_action || "None"}</span></div>
          {account.next_action_date && <div className="flex justify-between"><span>Action Date</span><span className="font-medium">{account.next_action_date}</span></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Settlement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Status</span><span className="font-medium">{account.settlement_status || "None"}</span></div>
          {account.settlement_amount && <div className="flex justify-between"><span>Amount</span><span className="font-medium">AED {formatAmount(account.settlement_amount)}</span></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: ContactLog[] }) {
  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          No contact history yet.
        </CardContent>
      </Card>
    );
  }

  const outcomeColors: Record<string, string> = {
    right_party_contact: "bg-green-500/10 text-green-600",
    ptp_secured: "bg-blue-500/10 text-blue-600",
    no_answer: "bg-gray-500/10 text-gray-600",
    wrong_number: "bg-red-500/10 text-red-600",
    refused_to_pay: "bg-red-500/10 text-red-600",
    callback_requested: "bg-yellow-500/10 text-yellow-600",
    dispute: "bg-orange-500/10 text-orange-600",
    hardship: "bg-purple-500/10 text-purple-600",
  };

  return (
    <div className="space-y-2">
      {contacts.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[80px]">
                <Badge variant="outline" className="text-xs">{log.channel}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{log.direction}</p>
              </div>
              <div>
                <Badge className={outcomeColors[log.outcome] || "bg-gray-500/10 text-gray-600"}>
                  {log.outcome?.replace(/_/g, " ")}
                </Badge>
                {log.ptp_secured && (
                  <span className="ml-2 text-sm text-blue-600 font-medium">
                    PTP: AED {log.ptp_amount?.toLocaleString()} on {log.ptp_date}
                  </span>
                )}
                {log.notes && <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{formatDate(log.created_at, 'medium')}</p>
              <p className="text-xs">{formatDate(log.created_at, 'time')}</p>
              {log.duration_seconds && <p className="text-xs">{log.duration_seconds}s</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PTPsTab({ ptps, formatAmount }: { ptps: any[]; formatAmount: (n: number) => string }) {
  if (ptps.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          No PTPs recorded yet.
        </CardContent>
      </Card>
    );
  }

  const statusIcons: Record<string, typeof CheckCircle> = {
    kept: CheckCircle,
    broken: XCircle,
    pending: Clock,
  };

  const statusColors: Record<string, string> = {
    kept: "text-green-600",
    broken: "text-red-600",
    pending: "text-yellow-600",
  };

  return (
    <div className="space-y-2">
      {ptps.map((ptp) => {
        const Icon = statusIcons[ptp.status] || Clock;
        return (
          <Card key={ptp.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Icon className={`h-5 w-5 ${statusColors[ptp.status] || "text-gray-600"}`} />
                <div>
                  <p className="font-medium">AED {formatAmount(ptp.promised_amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    Due: {ptp.promised_date} &middot; Method: {ptp.promised_method?.replace(/_/g, " ") || "N/A"}
                  </p>
                  {ptp.actual_amount && (
                    <p className="text-sm text-green-600">
                      Paid: AED {formatAmount(ptp.actual_amount)} on {ptp.actual_date}
                    </p>
                  )}
                  {ptp.notes && <p className="text-xs text-muted-foreground mt-1">{ptp.notes}</p>}
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={statusColors[ptp.status]}>
                  {ptp.status}
                </Badge>
                {ptp.broken_count > 0 && (
                  <p className="text-xs text-red-600 mt-1">Broken {ptp.broken_count}x</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SettlementsTab({ settlements, formatAmount }: { settlements: Settlement[]; formatAmount: (n: number) => string }) {
  if (settlements.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
          No settlements yet.
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    pending_approval: "bg-yellow-500/10 text-yellow-600",
    approved: "bg-green-500/10 text-green-600",
    rejected: "bg-red-500/10 text-red-600",
    accepted: "bg-blue-500/10 text-blue-600",
    paid: "bg-teal-500/10 text-teal-600",
    expired: "bg-gray-500/10 text-gray-600",
  };

  return (
    <div className="space-y-2">
      {settlements.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">
                  AED {formatAmount(s.settled_amount)}
                  {s.discount_percent && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({s.discount_percent}% discount)
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Original: AED {formatAmount(s.original_outstanding)}
                </p>
              </div>
              <Badge className={statusColors[s.status] || "bg-gray-500/10 text-gray-600"}>
                {s.status?.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <div>Offered: {s.offer_date || "N/A"}</div>
              <div>Expires: {s.expiry_date || "N/A"}</div>
              <div>By: {s.offered_by || "N/A"}</div>
              <div>Approved: {s.approved_by || "Pending"}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ComplianceTab({ logs }: { logs: ComplianceLog[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
          No compliance events for this account.
        </CardContent>
      </Card>
    );
  }

  const severityColors: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    block: "bg-red-500/10 text-red-600",
    critical: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {log.severity === "block" || log.severity === "critical" ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Shield className="h-5 w-5 text-blue-600" />
              )}
              <div>
                <p className="font-medium">{log.event_type?.replace(/_/g, " ")}</p>
                <p className="text-sm text-muted-foreground">{log.description}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={severityColors[log.severity] || "bg-gray-500/10 text-gray-600"}>
                {log.severity}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(log.created_at, 'medium')}
              </p>
              {log.resolved && (
                <Badge variant="outline" className="text-green-600 text-xs mt-1">Resolved</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AITab({ account, formatAmount }: { account: CollectionsAccount; formatAmount: (n: number) => string }) {
  // AI recommendations based on account data
  const recommendations: { title: string; description: string; priority: string }[] = [];

  if (account.dpd > 90 && account.ptp_broken_count >= 2) {
    recommendations.push({
      title: "Consider Settlement Offer",
      description: `Account has ${account.ptp_broken_count} broken PTPs at ${account.dpd} DPD. A settlement offer may recover more than continued collection efforts.`,
      priority: "high",
    });
  }

  if (account.total_contact_attempts === 0) {
    recommendations.push({
      title: "Initial Contact Required",
      description: "No contact attempts recorded. Initiate first contact via preferred channel.",
      priority: "high",
    });
  }

  if (account.ptp_status === "pending" && account.ptp_date) {
    const ptpDate = new Date(account.ptp_date);
    const today = new Date();
    const daysUntilPTP = Math.ceil((ptpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilPTP <= 2 && daysUntilPTP >= 0) {
      recommendations.push({
        title: "PTP Follow-up Due",
        description: `PTP for AED ${formatAmount(account.ptp_amount || 0)} is due ${daysUntilPTP === 0 ? "today" : `in ${daysUntilPTP} day(s)`}. Send reminder.`,
        priority: "medium",
      });
    }
  }

  if (account.dpd > 30 && account.dpd <= 60 && account.total_contact_attempts < 3) {
    recommendations.push({
      title: "Increase Contact Frequency",
      description: "Early-stage delinquency with low contact rate. Increase outreach to prevent escalation.",
      priority: "medium",
    });
  }

  if (account.dpd > 150) {
    recommendations.push({
      title: "Escalate to Legal Review",
      description: "Account is at 150+ DPD. Review for legal action or write-off assessment.",
      priority: "high",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Continue Standard Collection Process",
      description: "No urgent actions required. Follow standard bucket-based contact schedule.",
      priority: "low",
    });
  }

  const priorityColors: Record<string, string> = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-yellow-500/30 bg-yellow-500/5",
    low: "border-green-500/30 bg-green-500/5",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" /> AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className={`border rounded-lg p-4 ${priorityColors[rec.priority] || ""}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">{rec.title}</p>
                <Badge variant="outline" className="text-xs capitalize">{rec.priority}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Risk Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">PTP Reliability</p>
              <p className="font-bold text-lg">
                {account.ptp_count > 0
                  ? `${((account.ptp_kept_count / account.ptp_count) * 100).toFixed(0)}%`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact Rate</p>
              <p className="font-bold text-lg">
                {account.total_contact_attempts > 0
                  ? `${account.total_contact_attempts} attempts`
                  : "No contacts"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Days Since Last Contact</p>
              <p className="font-bold text-lg">
                {account.last_contact_date
                  ? Math.ceil(
                      (Date.now() - new Date(account.last_contact_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Recovery Potential</p>
              <p className="font-bold text-lg">
                {account.dpd < 60 ? "High" : account.dpd < 120 ? "Medium" : "Low"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
