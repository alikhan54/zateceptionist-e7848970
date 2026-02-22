import { useNavigate } from 'react-router-dom';
import { useComplianceData, useEmployees } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck, AlertTriangle, Clock, Users, Building2,
  CreditCard, Heart, Globe, CheckCircle2, XCircle
} from 'lucide-react';

export default function CompliancePage() {
  const navigate = useNavigate();
  const { data: compliance, isLoading } = useComplianceData();
  const { data: employees } = useEmployees();

  const goToAI = (message: string) => {
    navigate('/hr/ai-assistant', { state: { prefillMessage: message } });
  };

  const getExpiryBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (days <= 30) return <Badge variant="destructive">Expires in {days}d</Badge>;
    if (days <= 60) return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">Expires in {days}d</Badge>;
    return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">Expires in {days}d</Badge>;
  };

  const complianceScore = (() => {
    if (!employees?.length) return 0;
    const active = (employees || []).filter(e => e.employment_status === 'active');
    let score = 100;
    const noVisa = active.filter(e => !e.visa_status && e.nationality && !e.nationality.toLowerCase().includes('emirati')).length;
    const noBank = active.filter(e => !e.bank_name || !e.iban_number).length;
    const expiredVisa = (compliance?.visaAlerts || []).filter((v: any) => v.days_until_expiry < 0).length;
    score -= (noVisa / Math.max(active.length, 1)) * 20;
    score -= (noBank / Math.max(active.length, 1)) * 20;
    score -= (expiredVisa / Math.max(active.length, 1)) * 30;
    return Math.max(0, Math.round(score));
  })();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Compliance Center</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            UAE/GCC regulatory compliance monitoring & automation
          </p>
        </div>
        <Button onClick={() => goToAI('Generate a comprehensive compliance report covering WPS, Emiratisation, visas, licenses, and medical insurance')}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          AI Compliance Report
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{complianceScore}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
            </div>
            <Progress value={complianceScore} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{compliance?.visaAlerts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Visa Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{compliance?.emiratisationRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Emiratisation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{compliance?.wpsStatus?.filter((w: any) => w.has_bank).length || 0}/{compliance?.totalEmployees || 0}</p>
                <p className="text-sm text-muted-foreground">WPS Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{compliance?.totalEmployees || 0}</p>
                <p className="text-sm text-muted-foreground">Active Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visa">Visa & Immigration</TabsTrigger>
          <TabsTrigger value="wps">WPS</TabsTrigger>
          <TabsTrigger value="emiratisation">Emiratisation</TabsTrigger>
          <TabsTrigger value="medical">Medical & Licenses</TabsTrigger>
        </TabsList>

        {/* VISA TAB */}
        <TabsContent value="visa">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visa & Immigration Status</CardTitle>
                  <CardDescription>Track visas, work permits, and labor cards</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => goToAI('Check GDRFA immigration status for all employees with expiring visas')}>
                  Check GDRFA Status
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(compliance?.visaAlerts || []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Visa Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(compliance?.visaAlerts || []).map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</TableCell>
                        <TableCell>{emp.nationality || '-'}</TableCell>
                        <TableCell>{emp.visa_expiry_date}</TableCell>
                        <TableCell>{getExpiryBadge(emp.days_until_expiry)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => goToAI(`Track visa processing for employee ${emp.full_name || emp.first_name}`)}>
                            Track
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-chart-2 mb-4" />
                  <p className="font-medium">All Clear</p>
                  <p className="text-sm text-muted-foreground">No visa expiries within 90 days</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WPS TAB */}
        <TabsContent value="wps">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Wage Protection System (WPS)</CardTitle>
                  <CardDescription>MoHRE salary transfer compliance</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => goToAI('Prepare WPS submission file for all active employees this month')}>
                  Prepare WPS File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>WPS Ready</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(compliance?.wpsStatus || []).slice(0, 20).map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.bank_name || <Badge variant="destructive">Missing</Badge>}</TableCell>
                      <TableCell>{emp.iban ? `${emp.iban.slice(0, 8)}...` : <Badge variant="destructive">Missing</Badge>}</TableCell>
                      <TableCell>
                        {emp.has_bank ? (
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                            <XCircle className="h-3 w-3 mr-1" /> Incomplete
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMIRATISATION TAB */}
        <TabsContent value="emiratisation">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Emiratisation Report</CardTitle>
                  <CardDescription>UAE national workforce ratio for MoHRE compliance</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => goToAI('Generate detailed Emiratisation report with nationality breakdown by department')}>
                  Generate MoHRE Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-4xl font-bold">{compliance?.emiratisationRate || 0}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Current Emiratisation Rate</p>
                  <Progress value={compliance?.emiratisationRate || 0} className="h-2 mt-3" />
                </div>
                <div className="p-6 bg-chart-2/5 rounded-xl border border-chart-2/20">
                  <p className="text-4xl font-bold">{compliance?.uaeNationals || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">UAE Nationals</p>
                </div>
                <div className="p-6 bg-muted rounded-xl">
                  <p className="text-4xl font-bold">{(compliance?.totalEmployees || 0) - (compliance?.uaeNationals || 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Expatriates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEDICAL TAB */}
        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Medical Insurance & Professional Licenses</CardTitle>
                  <CardDescription>Health insurance coverage and license tracking</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => goToAI('Check medical insurance status and expiring professional licenses for all employees')}>
                  Check Status
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="font-medium">Medical insurance data will appear here</p>
                <p className="text-sm text-muted-foreground mt-1">Ensure employee records include medical_insurance_provider and expiry dates</p>
                <Button variant="outline" className="mt-4" onClick={() => goToAI('Generate medical insurance status report for all active employees')}>
                  Generate Report via AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}