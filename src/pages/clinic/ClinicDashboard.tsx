import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { useClinicProducts } from "@/hooks/useClinicProducts";
import { Users, Calendar, DollarSign, AlertTriangle, Syringe } from "lucide-react";

export default function ClinicDashboard() {
  const { patients, stats: patientStats, isLoading: pLoading } = useClinicPatients();
  const { treatments, isLoading: tLoading } = useClinicTreatments();
  const { lowStockProducts, isLoading: prLoading } = useClinicProducts();

  const isLoading = pLoading || tLoading || prLoading;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h1>
        <p className="text-muted-foreground">Healthcare & Aesthetics Management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">{patientStats.vipPatients} VIP, {patientStats.goldPatients} Gold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treatments</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{treatments.length}</div>
            <p className="text-xs text-muted-foreground">Active services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">New patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {patientStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all patients</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Patients</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : patients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No patients yet</p>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 5).map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={patient.loyalty_tier === 'VIP' ? 'default' : 'outline'}>{patient.loyalty_tier}</Badge>
                      <span className="text-xs text-muted-foreground">{patient.total_visits} visits</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">All products well-stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                    </div>
                    <Badge variant="destructive">{product.stock_quantity} left</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Treatment Menu</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {treatments.map((t) => (
              <div key={t.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm">{t.name}</h3>
                  <Badge variant="outline">{t.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span>{t.duration_minutes} min</span>
                  <span className="font-semibold">{t.currency} {t.price}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
