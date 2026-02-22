import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useEmployees } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Download,
  Upload,
  Filter,
  Grid3X3,
  List,
  UserCircle,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

const departments = ['All', 'Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
const statuses = ['All', 'Active', 'On Leave', 'Terminated'];
const employmentTypes = ['All', 'Full-time', 'Part-time', 'Contract', 'Intern'];

export default function EmployeesPage() {
  const { t } = useTenant();
  const { toast } = useToast();
  const { data: employees, isLoading, createEmployee, updateEmployee } = useEmployees();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [profileTab, setProfileTab] = useState('personal');

  const displayEmployees = employees || [];
  
  const filteredEmployees = displayEmployees.filter(emp => {
    const matchesSearch = 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.company_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'All' || emp.department_name === filterDept;
    const matchesStatus = filterStatus === 'All' || (emp.employment_status || '').toLowerCase().replace('_', ' ') === filterStatus.toLowerCase();
    const matchesType = filterType === 'All' || emp.employment_type === filterType;
    return matchesSearch && matchesDept && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
      on_leave: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
      terminated: 'bg-destructive/10 text-destructive border-destructive/20',
      suspended: 'bg-muted text-muted-foreground border-muted',
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.active}>
        {(status || '').replace('_', ' ')}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, id]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(e => e !== id));
    }
  };

  const openProfile = (employee: any) => {
    setSelectedEmployee(employee);
    setIsProfileOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const wizardSteps = [
    { step: 1, title: 'Personal Details', description: 'Basic information' },
    { step: 2, title: 'Employment', description: 'Job details' },
    { step: 3, title: 'Compensation', description: 'Salary & benefits' },
    { step: 4, title: 'Emergency Contact', description: 'Contact info' },
    { step: 5, title: 'Documents', description: 'Upload files' },
    { step: 6, title: 'Review', description: 'Confirm details' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('staffs')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add {t('staff')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New {t('staff')}</DialogTitle>
                <DialogDescription>
                  Complete the steps below to onboard a new team member
                </DialogDescription>
              </DialogHeader>
              
              {/* Wizard Progress */}
              <div className="flex items-center justify-between mb-6">
                {wizardSteps.map((s, i) => (
                  <div key={s.step} className="flex items-center">
                    <div className={cn(
                      'flex flex-col items-center',
                      s.step === wizardStep && 'text-primary',
                      s.step < wizardStep && 'text-chart-2',
                      s.step > wizardStep && 'text-muted-foreground'
                    )}>
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
                        s.step === wizardStep && 'border-primary bg-primary/10',
                        s.step < wizardStep && 'border-chart-2 bg-chart-2 text-white',
                        s.step > wizardStep && 'border-muted'
                      )}>
                        {s.step < wizardStep ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                      </div>
                      <span className="text-xs mt-1 hidden md:block">{s.title}</span>
                    </div>
                    {i < wizardSteps.length - 1 && (
                      <div className={cn(
                        'w-8 h-0.5 mx-2',
                        s.step < wizardStep ? 'bg-chart-2' : 'bg-muted'
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {/* Wizard Content */}
              <div className="py-4 min-h-[300px]">
                {wizardStep === 1 && (
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input placeholder="Doe" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="john.doe@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" placeholder="+1 555-0100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input type="date" />
                    </div>
                  </div>
                )}
                {wizardStep === 2 && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.filter(d => d !== 'All').map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input placeholder="Software Engineer" />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">John Smith</SelectItem>
                          <SelectItem value="2">Lisa Wang</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Employment Type</Label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {employmentTypes.filter(t => t !== 'All').map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </div>
                )}
                {wizardStep === 3 && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Annual Salary</Label>
                      <Input type="number" placeholder="85000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pay Frequency</Label>
                      <Select defaultValue="monthly">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Benefits Package</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {wizardStep === 4 && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Emergency Contact Name</Label>
                      <Input placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input type="tel" placeholder="+1 555-0199" />
                    </div>
                  </div>
                )}
                {wizardStep === 5 && (
                  <div className="grid gap-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">Upload Documents</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ID, Contracts, Certificates (PDF, max 10MB each)
                      </p>
                      <Button variant="outline" className="mt-4">
                        Choose Files
                      </Button>
                    </div>
                  </div>
                )}
                {wizardStep === 6 && (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      Review the information and click Submit to create the employee profile.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p><span className="text-muted-foreground">Name:</span> John Doe</p>
                      <p><span className="text-muted-foreground">Email:</span> john.doe@company.com</p>
                      <p><span className="text-muted-foreground">Department:</span> Engineering</p>
                      <p><span className="text-muted-foreground">Position:</span> Software Engineer</p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setIsAddDialogOpen(false)}
                >
                  {wizardStep === 1 ? 'Cancel' : 'Back'}
                </Button>
                <Button 
                  onClick={() => {
                    if (wizardStep < 6) {
                      setWizardStep(wizardStep + 1);
                    } else {
                      toast({ title: `${t('staff')} added successfully` });
                      setIsAddDialogOpen(false);
                      setWizardStep(1);
                    }
                  }}
                >
                  {wizardStep === 6 ? 'Submit' : 'Next'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Total {t('staffs')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayEmployees.filter(e => e.employment_status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayEmployees.filter(e => e.employment_status === 'on_leave').length}</p>
                <p className="text-sm text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{new Set(displayEmployees.map(e => e.department_name).filter(Boolean)).size}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={`Search ${t('staffs').toLowerCase()}...`}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {selectedEmployees.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedEmployees.length} selected
              </span>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedEmployees([])}>
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee List/Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No {t('staffs').toLowerCase()} found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : `Add your first ${t('staff').toLowerCase()} to get started`}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openProfile(employee)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div onClick={() => openProfile(employee)}>
                  <h3 className="font-semibold">{employee.full_name || `${employee.first_name} ${employee.last_name}`}</h3>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary">{employee.department_name || 'Unassigned'}</Badge>
                    {getStatusBadge(employee.employment_status)}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{employee.company_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Joined {employee.date_of_joining}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>{t('staff')}</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="cursor-pointer" onClick={() => openProfile(employee)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.full_name || `${employee.first_name} ${employee.last_name}`}</p>
                        <p className="text-xs text-muted-foreground">{employee.company_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.department_name || 'Unassigned'}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.date_of_joining}</TableCell>
                  <TableCell>{getStatusBadge(employee.employment_status)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProfile(employee)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Employee Profile Sheet */}
      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedEmployee && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl">
                      {selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                    </SheetTitle>
                    <SheetDescription>{selectedEmployee.position}</SheetDescription>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(selectedEmployee.employment_status)}
                      <Badge variant="secondary">{selectedEmployee.department_name || 'Unassigned'}</Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </div>

              <Tabs value={profileTab} onValueChange={setProfileTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedEmployee.company_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm">{selectedEmployee.phone || selectedEmployee.mobile || '-'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="text-sm">{selectedEmployee.department_name || 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Position</p>
                        <p className="text-sm">{selectedEmployee.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Joining</p>
                        <p className="text-sm">{selectedEmployee.date_of_joining}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="text-sm">{selectedEmployee.salary ? formatCurrency(selectedEmployee.salary) + '/year' : '-'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-4">
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No documents uploaded</p>
                    <Button variant="outline" className="mt-3">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <SheetFooter className="mt-6">
                <Button variant="outline" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
