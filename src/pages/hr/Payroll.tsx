import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { usePayroll } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Download,
  FileText,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

export default function PayrollPage() {
  const { t } = useTenant();
  const [selectedPeriod, setSelectedPeriod] = useState('2024-01');
  const { data, isLoading } = usePayroll(selectedPeriod);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      label: 'Total Payroll',
      value: formatCurrency(data?.summary?.total_payroll || 0),
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Average Salary',
      value: formatCurrency(data?.summary?.avg_salary || 0),
      icon: TrendingUp,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      label: 'Headcount',
      value: data?.summary?.headcount || 0,
      icon: Users,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    {
      label: 'Pay Period',
      value: data?.summary?.period || selectedPeriod,
      icon: Calendar,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { class: string; icon: React.ReactNode }> = {
      draft: {
        class: 'bg-muted text-muted-foreground',
        icon: <Clock className="h-3 w-3" />,
      },
      processed: {
        class: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
        icon: <Calculator className="h-3 w-3" />,
      },
      paid: {
        class: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
    };
    const style = styles[status] || styles.draft;
    return (
      <Badge variant="outline" className={`gap-1 ${style.class}`}>
        {style.icon}
        {status}
      </Badge>
    );
  };

  const periods = [
    { value: '2024-01', label: 'January 2024' },
    { value: '2023-12', label: 'December 2023' },
    { value: '2023-11', label: 'November 2023' },
    { value: '2023-10', label: 'October 2023' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground mt-1">
            Manage {t('staff').toLowerCase()} compensation and payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Current Pay Period Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Pay Period</p>
              <p className="text-2xl font-bold">January 1 - January 31, 2024</p>
              <p className="text-sm text-muted-foreground mt-1">
                Payment date: January 31, 2024
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <p className="text-sm text-muted-foreground">Processing Progress</p>
                <p className="text-lg font-semibold">75% Complete</p>
              </div>
              <Button>Run Payroll</Button>
            </div>
          </div>
          <Progress value={75} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Employee Payroll
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            Pay History
          </TabsTrigger>
          <TabsTrigger value="structure" className="gap-2">
            <Calculator className="h-4 w-4" />
            Salary Structure
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Payroll</CardTitle>
                  <CardDescription>Individual salary breakdown for the period</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : data?.records && data.records.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('staff')}</TableHead>
                      <TableHead className="text-right">Basic</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employee_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.basic_salary)}</TableCell>
                        <TableCell className="text-right text-chart-2">+{formatCurrency(record.allowances)}</TableCell>
                        <TableCell className="text-right text-destructive">-{formatCurrency(record.deductions)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">-{formatCurrency(record.tax)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(record.net_pay)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No payroll records for this period</p>
                  <p className="text-sm text-muted-foreground">
                    Run payroll to generate employee pay records
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>Previous payroll runs and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {periods.map((period) => (
                  <div key={period.value} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{period.label}</p>
                      <p className="text-sm text-muted-foreground">Paid on the 31st</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{formatCurrency(125000)}</span>
                      <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Salary Structure</CardTitle>
              <CardDescription>Configure salary components and deductions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Earnings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-chart-2/5 rounded-lg border border-chart-2/20">
                      <span>Basic Salary</span>
                      <span className="font-medium">Base component</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-chart-2/5 rounded-lg border border-chart-2/20">
                      <span>Housing Allowance</span>
                      <span className="font-medium">15% of Basic</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-chart-2/5 rounded-lg border border-chart-2/20">
                      <span>Transportation</span>
                      <span className="font-medium">Fixed $500</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Deductions</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <span>Income Tax</span>
                      <span className="font-medium">Progressive rate</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <span>Social Security</span>
                      <span className="font-medium">6.2% of Basic</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <span>Health Insurance</span>
                      <span className="font-medium">Fixed $200</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Reports</CardTitle>
              <CardDescription>Generate and download payroll reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="font-medium">Payroll Summary</p>
                    <p className="text-sm text-muted-foreground">Monthly overview</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <Calculator className="h-8 w-8 mx-auto text-chart-2 mb-2" />
                    <p className="font-medium">Tax Report</p>
                    <p className="text-sm text-muted-foreground">Tax withholdings</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-8 w-8 mx-auto text-chart-3 mb-2" />
                    <p className="font-medium">Cost Analysis</p>
                    <p className="text-sm text-muted-foreground">Labor cost breakdown</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
