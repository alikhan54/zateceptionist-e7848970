import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComplianceData, useEmployees, useHRDocuments } from '@/hooks/useHR';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircularProgress } from '@/components/hr/CircularProgress';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import {
  ShieldCheck, AlertTriangle, Clock, Users, Building2,
  CreditCard, Heart, Globe, CheckCircle2, XCircle, FileText,
  Calculator, Target, TrendingUp
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function CompliancePage() {
  const navigate = useNavigate();
  const { data: compliance, isLoading } = useComplianceData();
  const { data: employees } = useEmployees();
  const { tenantConfig } = useTenant();
  const { data: hrDocuments } = useHRDocuments();

  // Country-aware compliance framework detection
  const isUAE = ['UAE', 'UNITED ARAB EMIRATES', 'AE'].includes((tenantConfig?.country || '').toUpperCase());

  // Gratuity calculator state (UAE only, but always declared)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [manualSalary, setManualSalary] = useState<string>('');
  const [manualYears, setManualYears] = useState<string>('');

  const goToAI = (message: string) => {
    navigate('/hr/ai-assistant', { state: { prefillMessage: message } });
  };

  const getExpiryBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive" className="animate-pulse">Expired</Badge>;
    if (days <= 30) return <Badge variant="destructive">Expires in {days}d</Badge>;
    if (days <= 60) return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">Expires in {days}d</Badge>;
    return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">Expires in {days}d</Badge>;
  };

  const getMedicalBadge = (item: any) => {
    if (!item.has_insurance) return <Badge variant="destructive">Missing</Badge>;
    if (item.days_until_expiry === null) return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">Active</Badge>;
    if (item.days_until_expiry < 0) return <Badge variant="destructive" className="animate-pulse">Expired</Badge>;
    if (item.days_until_expiry <= 60) return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">Expiring in {item.days_until_expiry}d</Badge>;
    return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">Active</Badge>;
  };

  // === UAE COMPLIANCE SCORE ===
  const complianceScore = (() => {
    if (!employees?.length) return 0;
    const active = (employees || []).filter((e: any) => e.employment_status === 'active');
    let score = 100;
    const noVisa = active.filter((e: any) => !e.visa_status && e.nationality && !e.nationality.toLowerCase().includes('emirati')).length;
    const noBank = active.filter((e: any) => !e.bank_name || !e.iban_number).length;
    const expiredVisa = (compliance?.visaAlerts || []).filter((v: any) => v.days_until_expiry < 0).length;
    const noMedical = (compliance?.medicalStatus || []).filter((m: any) => !m.has_insurance).length;
    score -= (noVisa / Math.max(active.length, 1)) * 15;
    score -= (noBank / Math.max(active.length, 1)) * 20;
    score -= (expiredVisa / Math.max(active.length, 1)) * 25;
    score -= (noMedical / Math.max(active.length, 1)) * 15;
    return Math.max(0, Math.round(score));
  })();

  // === GENERIC COMPLIANCE DATA ===
  const documentExpiryAlerts = useMemo(() => {
    if (!employees?.length) return [];
    const now = Date.now();
    return (employees || [])
      .flatMap((e: any) => {
        const items: { type: string; expiry: string; days: number; employee_id: string; employee_name: string }[] = [];
        const check = (label: string, date: string | null | undefined) => {
          if (!date) return;
          const days = Math.floor((new Date(date).getTime() - now) / 86400000);
          if (days <= 90) items.push({ type: label, expiry: date, days, employee_id: e.id, employee_name: e.full_name || `${e.first_name} ${e.last_name}` });
        };
        check('Passport', e.passport_expiry);
        check('Work Permit', e.work_permit_expiry);
        check('Visa', e.visa_expiry_date);
        return items;
      })
      .sort((a, b) => a.days - b.days);
  }, [employees]);

  const contractDocs = useMemo(() =>
    (hrDocuments || []).filter((d: any) => ['employment_contract', 'offer_letter'].includes(d.document_type)),
    [hrDocuments]
  );

  const policyDocs = useMemo(() =>
    (hrDocuments || []).filter((d: any) => d.category === 'policies' || d.document_type === 'policy'),
    [hrDocuments]
  );

  const genericComplianceScore = useMemo(() => {
    if (!employees?.length) return 0;
    const active = employees.filter((e: any) => e.employment_status === 'active');
    if (!active.length) return 0;
    let score = 100;
    const expiredDocs = documentExpiryAlerts.filter(d => d.days < 0).length;
    score -= Math.min(30, (expiredDocs / active.length) * 30);
    const noMedical = (compliance?.medicalStatus || []).filter((m: any) => !m.has_insurance).length;
    score -= (noMedical / active.length) * 20;
    return Math.max(0, Math.round(score));
  }, [employees, documentExpiryAlerts, compliance]);

  const effectiveScore = isUAE ? complianceScore : genericComplianceScore;

  const emiratisationData = [
    { name: 'UAE Nationals', value: compliance?.uaeNationals || 0, color: 'hsl(var(--chart-2))' },
    { name: 'Expatriates', value: (compliance?.totalEmployees || 0) - (compliance?.uaeNationals || 0), color: 'hsl(var(--chart-4))' },
  ];

  // Medical stats
  const medicalCovered = (compliance?.medicalStatus || []).filter((m: any) => m.has_insurance).length;
  const medicalExpiring = (compliance?.medicalStatus || []).filter((m: any) => m.has_insurance && m.days_until_expiry !== null && m.days_until_expiry <= 60 && m.days_until_expiry > 0).length;
  const medicalMissing = (compliance?.medicalStatus || []).filter((m: any) => !m.has_insurance).length;

  // Labor card stats
  const laborCardExpiringSoon = (compliance?.laborCardAlerts || []).filter((l: any) => l.days_until_lc_expiry <= 90).length;

  // Gratuity calculator
  const gratuityCalc = useMemo(() => {
    let salary = 0;
    let years = 0;

    if (selectedEmployeeId && employees) {
      const emp = employees.find((e: any) => e.id === selectedEmployeeId);
      if (emp) {
        salary = emp.salary || 0;
        const joinDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;
        if (joinDate) {
          const diffMs = Date.now() - joinDate.getTime();
          years = Math.max(0, diffMs / (365.25 * 24 * 60 * 60 * 1000));
        }
      }
    } else if (manualSalary && manualYears) {
      salary = parseFloat(manualSalary) || 0;
      years = parseFloat(manualYears) || 0;
    }

    if (salary <= 0 || years <= 0) return null;

    const dailySalary = salary / 30;
    const firstFiveYears = Math.min(years, 5);
    const afterFiveYears = Math.max(0, years - 5);
    const firstPortion = firstFiveYears * 21 * dailySalary;
    const secondPortion = afterFiveYears * 30 * dailySalary;
    const total = Math.min(firstPortion + secondPortion, salary * 24);

    return {
      salary,
      years: Math.round(years * 10) / 10,
      dailySalary: Math.round(dailySalary),
      firstPortion: Math.round(firstPortion),
      secondPortion: Math.round(secondPortion),
      total: Math.round(total),
    };
  }, [selectedEmployeeId, employees, manualSalary, manualYears]);

  // Emiratisation quota
  const emiratisationTarget = 10; // MoHRE 2026 target %
  const currentRate = compliance?.emiratisationRate || 0;
  const isAboveTarget = currentRate >= emiratisationTarget;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with dark accent */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7" />
              <h1 className="text-3xl font-bold">Compliance Center</h1>
            </div>
            <p className="text-slate-300 mt-1">
              {isUAE ? '\u{1F1E6}\u{1F1EA} UAE Compliance Framework' : '\u{1F310} Standard Compliance Framework'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => goToAI(
            isUAE
              ? 'Generate a comprehensive compliance report covering WPS, Emiratisation, visas, licenses, and medical insurance'
              : 'Generate a compliance report covering document expiries, medical insurance, and contract status'
          )}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            AI Compliance Report
          </Button>
        </div>
      </div>

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      {isUAE ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <CircularProgress value={complianceScore} size={72} strokeWidth={5}>
                <span className="text-lg font-bold">{complianceScore}%</span>
              </CircularProgress>
              <p className="text-sm text-muted-foreground mt-2">Compliance Score</p>
            </CardContent>
          </Card>
          {[
            { label: 'Visa Alerts', value: compliance?.visaAlerts?.length || 0, icon: AlertTriangle, color: 'destructive' },
            { label: 'Emiratisation', value: compliance?.emiratisationRate || 0, icon: Globe, color: 'chart-2', suffix: '%' },
            { label: 'WPS Ready', value: compliance?.wpsStatus?.filter((w: any) => w.has_bank).length || 0, icon: CreditCard, color: 'chart-3', total: compliance?.totalEmployees },
            { label: 'Active Staff', value: compliance?.totalEmployees || 0, icon: Users, color: 'chart-4' },
            { label: 'Medical Coverage', value: medicalCovered, icon: Heart, color: 'chart-1', total: compliance?.totalEmployees },
            { label: 'Labor Card Alerts', value: laborCardExpiringSoon, icon: FileText, color: 'chart-5' },
          ].map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                      {stat.total !== undefined && <span className="text-sm text-muted-foreground font-normal">/{stat.total}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <CircularProgress value={effectiveScore} size={72} strokeWidth={5}>
                <span className="text-lg font-bold">{effectiveScore}%</span>
              </CircularProgress>
              <p className="text-sm text-muted-foreground mt-2">Compliance Score</p>
            </CardContent>
          </Card>
          {[
            { label: 'Document Alerts', value: documentExpiryAlerts.length, icon: AlertTriangle, color: 'destructive' },
            { label: 'Medical Coverage', value: medicalCovered, icon: Heart, color: 'chart-1', total: compliance?.totalEmployees },
            { label: 'Active Staff', value: compliance?.totalEmployees || 0, icon: Users, color: 'chart-4' },
          ].map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      <AnimatedNumber value={stat.value} />
                      {stat.total !== undefined && <span className="text-sm text-muted-foreground font-normal">/{stat.total}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════ TABS ═══════════════ */}
      {isUAE ? (
        <Tabs defaultValue="visa" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="visa">Visa & Immigration</TabsTrigger>
            <TabsTrigger value="wps">WPS</TabsTrigger>
            <TabsTrigger value="emiratisation">Emiratisation</TabsTrigger>
            <TabsTrigger value="medical">Medical Insurance</TabsTrigger>
            <TabsTrigger value="labor">Labor Cards</TabsTrigger>
            <TabsTrigger value="gratuity">Gratuity Calculator</TabsTrigger>
          </TabsList>

          {/* UAE Tab 1: Visa & Immigration */}
          <TabsContent value="visa">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Visa & Immigration Status</CardTitle><CardDescription>Track visas, work permits, and labor cards</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Check GDRFA immigration status for all employees with expiring visas')}>Check GDRFA Status</Button>
                </div>
              </CardHeader>
              <CardContent>
                {(compliance?.visaAlerts || []).length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Nationality</TableHead><TableHead>Visa Expiry</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(compliance?.visaAlerts || []).map((emp: any) => (
                        <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</TableCell>
                          <TableCell>{emp.nationality || '-'}</TableCell>
                          <TableCell>{emp.visa_expiry_date}</TableCell>
                          <TableCell>{getExpiryBadge(emp.days_until_expiry)}</TableCell>
                          <TableCell><Button variant="ghost" size="sm" onClick={() => goToAI(`Track visa processing for employee ${emp.full_name || emp.first_name}`)}>Track</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-chart-2 mb-4" />
                    <p className="font-medium text-chart-2">All Clear</p>
                    <p className="text-sm text-muted-foreground">No visa expiries within 90 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* UAE Tab 2: WPS */}
          <TabsContent value="wps">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Wage Protection System (WPS)</CardTitle><CardDescription>MoHRE salary transfer compliance</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Prepare WPS submission file for all active employees this month')}>Prepare WPS File</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Bank</TableHead><TableHead>IBAN</TableHead><TableHead>WPS Ready</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(compliance?.wpsStatus || []).slice(0, 20).map((emp: any) => (
                      <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.bank_name || <Badge variant="destructive">Missing</Badge>}</TableCell>
                        <TableCell className="font-mono text-xs">{emp.iban ? `${emp.iban.slice(0, 4)}••••${emp.iban.slice(-4)}` : <Badge variant="destructive">Missing</Badge>}</TableCell>
                        <TableCell>
                          {emp.has_bank ? (
                            <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline"><XCircle className="h-3 w-3 mr-1" />Incomplete</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UAE Tab 3: Emiratisation */}
          <TabsContent value="emiratisation">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Emiratisation Report</CardTitle><CardDescription>UAE national workforce ratio for MoHRE compliance</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Generate detailed Emiratisation report with nationality breakdown by department')}>Generate MoHRE Report</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={emiratisationData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                            {emiratisationData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-chart-2/5 rounded-xl border border-chart-2/20 text-center">
                        <p className="text-3xl font-bold text-chart-2"><AnimatedNumber value={compliance?.uaeNationals || 0} /></p>
                        <p className="text-sm text-muted-foreground">UAE Nationals</p>
                      </div>
                      <div className="p-4 bg-muted rounded-xl text-center">
                        <p className="text-3xl font-bold"><AnimatedNumber value={(compliance?.totalEmployees || 0) - (compliance?.uaeNationals || 0)} /></p>
                        <p className="text-sm text-muted-foreground">Expatriates</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 bg-primary/5 rounded-xl border border-primary/20">
                      <p className="text-4xl font-bold"><AnimatedNumber value={currentRate} suffix="%" /></p>
                      <p className="text-sm text-muted-foreground mt-1">Current Emiratisation Rate</p>
                      <Progress value={currentRate} className="h-2 mt-3" />
                    </div>
                    <div className={`p-5 rounded-xl border ${isAboveTarget ? 'bg-chart-2/5 border-chart-2/20' : 'bg-destructive/5 border-destructive/20'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            <p className="font-semibold">MoHRE 2026 Target</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{emiratisationTarget}% minimum UAE national workforce</p>
                        </div>
                        {isAboveTarget ? (
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">
                            <TrendingUp className="h-3 w-3 mr-1" />Above Target
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />Below Target
                          </Badge>
                        )}
                      </div>
                      {!isAboveTarget && (compliance?.totalEmployees || 0) > 0 && (
                        <p className="text-sm mt-3 text-destructive">
                          You need {Math.ceil((emiratisationTarget / 100) * (compliance?.totalEmployees || 0)) - (compliance?.uaeNationals || 0)} more UAE national(s) to reach the {emiratisationTarget}% target
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UAE Tab 4: Medical Insurance */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Medical Insurance Coverage</CardTitle><CardDescription>DHA mandatory health insurance compliance</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Check medical insurance status and renewal schedule for all employees')}>Check Status</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-chart-2/5 rounded-xl border border-chart-2/20 text-center">
                    <p className="text-2xl font-bold text-chart-2">{medicalCovered}</p>
                    <p className="text-sm text-muted-foreground">Covered</p>
                  </div>
                  <div className="p-4 bg-chart-4/5 rounded-xl border border-chart-4/20 text-center">
                    <p className="text-2xl font-bold text-chart-4">{medicalExpiring}</p>
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  </div>
                  <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20 text-center">
                    <p className="text-2xl font-bold text-destructive">{medicalMissing}</p>
                    <p className="text-sm text-muted-foreground">Missing</p>
                  </div>
                </div>
                {(compliance?.medicalStatus || []).length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Provider</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(compliance?.medicalStatus || []).map((emp: any) => (
                        <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.provider || <span className="text-destructive font-medium">Not enrolled</span>}</TableCell>
                          <TableCell>{emp.expiry || '-'}</TableCell>
                          <TableCell>{getMedicalBadge(emp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 mx-auto text-destructive/30 mb-4" />
                    <p className="font-medium">No employee data available</p>
                    <p className="text-sm text-muted-foreground mt-1">Add employees with medical insurance details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* UAE Tab 5: Labor Cards */}
          <TabsContent value="labor">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Labor Card Status</CardTitle><CardDescription>MoHRE labor card tracking for non-UAE national employees</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Check labor card renewal status for all expatriate employees')}>Check MoHRE Status</Button>
                </div>
              </CardHeader>
              <CardContent>
                {(compliance?.laborCardAlerts || []).length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Nationality</TableHead><TableHead>Labor Card #</TableHead><TableHead>Expiry</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(compliance?.laborCardAlerts || []).map((emp: any) => (
                        <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.nationality || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{emp.labor_card_number || '-'}</TableCell>
                          <TableCell>{emp.labor_card_expiry}</TableCell>
                          <TableCell>{emp.days_until_lc_expiry}</TableCell>
                          <TableCell>{getExpiryBadge(emp.days_until_lc_expiry)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-chart-2 mb-4" />
                    <p className="font-medium text-chart-2">No Labor Card Data</p>
                    <p className="text-sm text-muted-foreground">Add labor card details to employee records to enable tracking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* UAE Tab 6: Gratuity Calculator */}
          <TabsContent value="gratuity">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>End-of-Service Gratuity Calculator</CardTitle><CardDescription>Per UAE Labour Law (Federal Decree-Law No. 33 of 2021, Article 51)</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Calculate end-of-service gratuity for all employees and generate a liability report')}>AI Gratuity Report</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium">Select Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={(val) => { setSelectedEmployeeId(val); setManualSalary(''); setManualYears(''); }}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Choose an employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(employees || []).filter((e: any) => e.employment_status === 'active').map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name || `${emp.first_name} ${emp.last_name}`} — AED {(emp.salary || 0).toLocaleString()}/mo
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or enter manually</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Monthly Salary (AED)</Label>
                        <Input type="number" placeholder="e.g. 25000" value={manualSalary} onChange={(e) => { setManualSalary(e.target.value); setSelectedEmployeeId(''); }} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Years of Service</Label>
                        <Input type="number" placeholder="e.g. 3.5" step="0.1" value={manualYears} onChange={(e) => { setManualYears(e.target.value); setSelectedEmployeeId(''); }} className="mt-1.5" />
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-sm space-y-1">
                      <p className="font-medium flex items-center gap-1.5"><Calculator className="h-4 w-4" /> UAE Gratuity Formula</p>
                      <p className="text-muted-foreground">First 5 years: 21 days basic salary per year</p>
                      <p className="text-muted-foreground">After 5 years: 30 days basic salary per year</p>
                      <p className="text-muted-foreground">Cap: Total cannot exceed 2 years salary</p>
                    </div>
                  </div>
                  <div>
                    {gratuityCalc ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                          <p className="text-sm text-muted-foreground">Total Gratuity</p>
                          <p className="text-4xl font-bold mt-1">AED {gratuityCalc.total.toLocaleString()}</p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm text-muted-foreground">Monthly Salary</span>
                            <span className="font-medium">AED {gratuityCalc.salary.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm text-muted-foreground">Daily Rate (salary/30)</span>
                            <span className="font-medium">AED {gratuityCalc.dailySalary.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm text-muted-foreground">Years of Service</span>
                            <span className="font-medium">{gratuityCalc.years} years</span>
                          </div>
                          <div className="flex justify-between p-3 bg-chart-2/5 rounded-lg border border-chart-2/10">
                            <span className="text-sm text-muted-foreground">First 5 years (21 days/yr)</span>
                            <span className="font-medium text-chart-2">AED {gratuityCalc.firstPortion.toLocaleString()}</span>
                          </div>
                          {gratuityCalc.secondPortion > 0 && (
                            <div className="flex justify-between p-3 bg-chart-4/5 rounded-lg border border-chart-4/10">
                              <span className="text-sm text-muted-foreground">After 5 years (30 days/yr)</span>
                              <span className="font-medium text-chart-4">AED {gratuityCalc.secondPortion.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <Calculator className="h-16 w-16 text-muted-foreground/20 mb-4" />
                        <p className="font-medium text-muted-foreground">Select an employee or enter details</p>
                        <p className="text-sm text-muted-foreground mt-1">The gratuity calculation will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* ═══════════════ GENERIC (NON-UAE) TABS ═══════════════ */
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="documents">Document Compliance</TabsTrigger>
            <TabsTrigger value="medical">Medical Insurance</TabsTrigger>
            <TabsTrigger value="contracts">Employment Contracts</TabsTrigger>
            <TabsTrigger value="policies">Policy Acknowledgments</TabsTrigger>
          </TabsList>

          {/* Generic Tab 1: Document Compliance */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Document Compliance</CardTitle><CardDescription>Passport, work permit, and visa expiry tracking</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Check document expiry status for all employees')}>AI Document Check</Button>
                </div>
              </CardHeader>
              <CardContent>
                {documentExpiryAlerts.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Document</TableHead><TableHead>Expiry Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {documentExpiryAlerts.map((alert, idx) => (
                        <TableRow key={`${alert.employee_id}-${alert.type}-${idx}`} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{alert.employee_name}</TableCell>
                          <TableCell>{alert.type}</TableCell>
                          <TableCell>{alert.expiry}</TableCell>
                          <TableCell>{getExpiryBadge(alert.days)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-chart-2 mb-4" />
                    <p className="font-medium text-chart-2">All Clear</p>
                    <p className="text-sm text-muted-foreground">No document expiries within 90 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generic Tab 2: Medical Insurance */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Medical Insurance Coverage</CardTitle><CardDescription>Employee health insurance coverage tracking</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Check medical insurance status and renewal schedule for all employees')}>Check Status</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-chart-2/5 rounded-xl border border-chart-2/20 text-center">
                    <p className="text-2xl font-bold text-chart-2">{medicalCovered}</p>
                    <p className="text-sm text-muted-foreground">Covered</p>
                  </div>
                  <div className="p-4 bg-chart-4/5 rounded-xl border border-chart-4/20 text-center">
                    <p className="text-2xl font-bold text-chart-4">{medicalExpiring}</p>
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  </div>
                  <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20 text-center">
                    <p className="text-2xl font-bold text-destructive">{medicalMissing}</p>
                    <p className="text-sm text-muted-foreground">Missing</p>
                  </div>
                </div>
                {(compliance?.medicalStatus || []).length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Provider</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(compliance?.medicalStatus || []).map((emp: any) => (
                        <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.provider || <span className="text-destructive font-medium">Not enrolled</span>}</TableCell>
                          <TableCell>{emp.expiry || '-'}</TableCell>
                          <TableCell>{getMedicalBadge(emp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 mx-auto text-destructive/30 mb-4" />
                    <p className="font-medium">No employee data available</p>
                    <p className="text-sm text-muted-foreground mt-1">Add employees with medical insurance details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generic Tab 3: Employment Contracts */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Employment Contracts</CardTitle><CardDescription>Contract and offer letter tracking</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Review employment contract status for all employees')}>AI Contract Review</Button>
                </div>
              </CardHeader>
              <CardContent>
                {contractDocs.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {contractDocs.map((doc: any) => (
                        <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{doc.title || doc.document_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {doc.document_type === 'employment_contract' ? 'Contract' : 'Offer Letter'}
                            </Badge>
                          </TableCell>
                          <TableCell>{doc.expiry_date || '-'}</TableCell>
                          <TableCell>
                            {doc.is_verified ? (
                              <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">
                                <Clock className="h-3 w-3 mr-1" />Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="font-medium">No Contracts Found</p>
                    <p className="text-sm text-muted-foreground mt-1">Upload employment contracts in the Documents section</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generic Tab 4: Policy Acknowledgments */}
          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Policy Acknowledgments</CardTitle><CardDescription>Track employee acknowledgment of company policies</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => goToAI('Check which employees have not acknowledged company policies')}>AI Policy Check</Button>
                </div>
              </CardHeader>
              <CardContent>
                {policyDocs.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Policy</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {policyDocs.map((doc: any) => (
                        <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{doc.title || doc.document_name || '-'}</TableCell>
                          <TableCell>{doc.category || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{doc.status || 'active'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="font-medium">No Policy Documents</p>
                    <p className="text-sm text-muted-foreground mt-1">Upload company policies in the Documents section</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
