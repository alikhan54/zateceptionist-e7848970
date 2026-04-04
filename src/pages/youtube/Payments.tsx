import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import {
  useYTChannels,
  useYTPayments,
  useCreateYTPayment,
} from "@/hooks/useYouTubeAgency";

const CURRENCIES = ["USD", "AED", "EUR"];
const PAYMENT_METHODS = [
  { value: "usdt_bitget", label: "USDT Bitget" },
  { value: "paypal", label: "PayPal" },
  { value: "payoneer", label: "Payoneer" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  confirmed: "bg-green-500/10 text-green-600 border-green-500/30",
  failed: "bg-red-500/10 text-red-600 border-red-500/30",
  refunded: "bg-gray-500/10 text-gray-600 border-gray-500/30",
};

const formatAmount = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);

export default function Payments() {
  const [channelId, setChannelId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const { data: channels } = useYTChannels();
  const { data: payments, isLoading } = useYTPayments();
  const createPayment = useCreateYTPayment();

  const handleCreate = () => {
    if (!amount || !paymentMethod) return;
    createPayment.mutate({
      channel_id: channelId || null,
      amount: Number(amount),
      currency,
      payment_method: paymentMethod,
      transaction_id: transactionId || null,
      payment_proof_url: null,
      payer_name: payerName || null,
      payer_email: payerEmail || null,
      status: "pending",
      notes: notes || null,
    });
    // Reset form
    setChannelId("");
    setAmount("");
    setCurrency("USD");
    setPaymentMethod("");
    setTransactionId("");
    setPayerName("");
    setPayerEmail("");
    setNotes("");
  };

  // Revenue KPIs
  const totalRevenue =
    payments
      ?.filter((p) => p.status === "confirmed")
      .reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingAmount =
    payments
      ?.filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0) || 0;
  const confirmedCount =
    payments?.filter((p) => p.status === "confirmed").length || 0;
  const avgDeal =
    confirmedCount > 0 ? totalRevenue / confirmedCount : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Record and track payments from YouTube agency clients
        </p>
      </div>

      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(totalRevenue, "USD")}
            </p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {formatAmount(pendingAmount, "USD")}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {confirmedCount}
            </p>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {formatAmount(avgDeal, "USD")}
            </p>
            <p className="text-sm text-muted-foreground">Average Deal</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {(channels || []).map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.channel_name || ch.handle || ch.channel_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-id">Transaction ID</Label>
              <Input
                id="tx-id"
                placeholder="e.g. TXN-12345"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payer-name">Payer Name</Label>
              <Input
                id="payer-name"
                placeholder="Name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payer-email">Payer Email</Label>
              <Input
                id="payer-email"
                type="email"
                placeholder="email@example.com"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!amount || !paymentMethod || createPayment.isPending}
          >
            {createPayment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <DollarSign className="h-4 w-4 mr-2" />
            )}
            Record Payment
          </Button>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading payments...
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments recorded</p>
              <p className="text-sm mt-1">
                Record a payment above to start tracking
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Payer
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Method
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-medium">
                        {payment.payer_name || "N/A"}
                      </td>
                      <td className="py-3 font-semibold">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">
                          {payment.payment_method.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            STATUS_COLORS[payment.status] ||
                            STATUS_COLORS.pending
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">
                        {payment.transaction_id || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
