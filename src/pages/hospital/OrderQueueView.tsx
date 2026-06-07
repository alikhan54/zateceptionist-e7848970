import { useMemo } from "react";
import { CheckCircle2, Clock, Inbox } from "lucide-react";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import {
  useHospitalOrders, STATUS_LABEL, NEXT_STATUS, type HospitalOrderType,
} from "@/hooks/useHospitalOrders";
import { HospitalGate, EcgLine } from "./hospitalShared";

const PENDING = ["ordered", "routed", "in_progress"];
const FULFILLED = ["resulted", "dispensed", "reviewed"];

interface Props {
  type: HospitalOrderType;
  title: string;
  eyebrow: string;
  icon: any;
  actionLabel: string; // e.g. "Dispense" / "Mark resulted"
  embedded?: boolean;  // hide the big hero header when embedded under another page (e.g. Laboratory)
}

export function OrderQueueInner({ type, title, eyebrow, icon: Icon, actionLabel, embedded }: Props) {
  const { orders, updateOrderStatus } = useHospitalOrders({ orderType: type });
  const { patients } = useClinicPatients();
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    (patients as any[]).forEach((p) => { m[p.id] = p.full_name; });
    return m;
  }, [patients]);

  const pending = orders.filter((o) => PENDING.includes(o.status));
  const fulfilled = orders.filter((o) => FULFILLED.includes(o.status));

  const Row = ({ o, done }: { o: any; done: boolean }) => (
    <li className="flex items-center gap-3 py-2.5 border-t" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-queue-row">
      <span className={`hx-chip ${done ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.1rem 0.5rem" }}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{STATUS_LABEL[o.status]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{(o.details as any)?.item || "—"}</div>
        <div className="hx-faint text-xs truncate">{nameById[o.patient_id] || "Unknown patient"} · {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      {!done && NEXT_STATUS[type] && (
        <button className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.7rem" }}
          onClick={() => updateOrderStatus.mutate({ id: o.id, status: NEXT_STATUS[type]! })} data-testid="hx-queue-action">
          {actionLabel}
        </button>
      )}
    </li>
  );

  return (
    <div data-testid={`hx-queue-page-${type}`}>
      {embedded ? (
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
          <span className="font-semibold">{title}</span>
          <span className="hx-chip hx-chip--warn ml-auto" data-testid="hx-queue-pending-count">{pending.length} pending</span>
          <span className="hx-chip hx-chip--ok">{fulfilled.length} done</span>
        </div>
      ) : (
        <div className="hx-panel hx-panel--accent hx-rise">
          <div className="hx-panel-b">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6" style={{ color: "var(--hx-accent)" }} />
              <div>
                <div className="hx-eyebrow">{eyebrow}</div>
                <h1 className="hx-h1">{title}</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hx-chip hx-chip--warn" data-testid="hx-queue-pending-count">{pending.length} pending</span>
                <span className="hx-chip hx-chip--ok">{fulfilled.length} done</span>
              </div>
            </div>
            <EcgLine className="mt-3" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="hx-panel hx-rise" style={{ animationDelay: "80ms" }}>
          <div className="hx-panel-h"><Clock className="h-4 w-4" style={{ color: "var(--hx-warn)" }} /><span className="font-semibold">Worklist · Pending</span></div>
          <div className="hx-panel-b">
            {pending.length === 0 ? (
              <div className="text-center py-8 hx-faint"><Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" /><p className="text-sm">Queue clear — no pending orders.</p></div>
            ) : <ul>{pending.map((o) => <Row key={o.id} o={o} done={false} />)}</ul>}
          </div>
        </div>
        <div className="hx-panel hx-rise" style={{ animationDelay: "140ms" }}>
          <div className="hx-panel-h"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--hx-ok)" }} /><span className="font-semibold">Completed today</span></div>
          <div className="hx-panel-b">
            {fulfilled.length === 0 ? <p className="hx-faint text-sm py-4">Nothing completed yet.</p>
              : <ul>{fulfilled.map((o) => <Row key={o.id} o={o} done />)}</ul>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderQueueView(props: Props) {
  return <HospitalGate><OrderQueueInner {...props} /></HospitalGate>;
}
