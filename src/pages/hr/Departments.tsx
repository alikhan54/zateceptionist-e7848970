import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useDepartments, useEmployees } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AskAIButton } from '@/components/hr/AskAIButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Network, 
  Plus, 
  Users, 
  DollarSign,
  Building2,
  UserCircle,
  Edit,
  MoreHorizontal,
  GitBranch,
  BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DepartmentsPage() {
  const { t, tenantConfig } = useTenant();
  const { data: departments, isLoading, createDepartment, updateDepartment } = useDepartments();
  const { data: employees } = useEmployees();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDept, setEditDept] = useState<{ id: string; name: string; code: string; manager_id: string }>({ id: '', name: '', code: '', manager_id: '' });
  const [newDept, setNewDept] = useState({ name: '', code: '', manager_id: '' });

  const navigate = useNavigate();

  const handleCreateDepartment = () => {
    createDepartment.mutate(newDept);
    setIsDialogOpen(false);
    setNewDept({ name: '', code: '', manager_id: '' });
  };

  const handleEditDepartment = () => {
    if (!editDept.id) return;
    updateDepartment.mutate({ id: editDept.id, name: editDept.name, code: editDept.code, manager_id: editDept.manager_id || undefined });
    setIsEditOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const displayDepartments = departments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizational structure and teams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AskAIButton message="Analyze department structure, headcount distribution, budget allocation, and suggest organizational improvements" label="AI Insights" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
              <DialogDescription>
                Add a new department to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input
                  placeholder="e.g., Engineering"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department Code</Label>
                <Input
                  placeholder="e.g., ENG"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Department Manager</Label>
                <Select 
                  value={newDept.manager_id} 
                  onValueChange={(value) => setNewDept({ ...newDept, manager_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees || [])
                      .filter(e => e.employment_status === 'active')
                      .map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name || `${e.first_name} ${e.last_name}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDepartment} disabled={createDepartment.isPending}>
                {createDepartment.isPending ? 'Creating...' : 'Create Department'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayDepartments.length}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {displayDepartments.reduce((acc, d) => acc + d.employee_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total {t('staffs')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayDepartments.filter(d => d.manager_name).length}</p>
                <p className="text-sm text-muted-foreground">Managers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(displayDepartments.reduce((acc, d) => acc + (d.budget || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid" className="gap-2">
            <Building2 className="h-4 w-4" />
            Grid View
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Org Chart
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
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
          ) : displayDepartments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayDepartments.map((dept) => (
                <Card key={dept.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Network className="h-6 w-6 text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditDept({ id: dept.id, name: dept.name, code: dept.code || '', manager_id: dept.manager_id || '' });
                            setIsEditOpen(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/hr/employees?department=${dept.name}`)}>
                            <Users className="h-4 w-4 mr-2" />
                            View {t('staffs')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{dept.name}</h3>
                          <Badge variant="secondary" className="text-xs">{dept.code}</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCircle className="h-4 w-4" />
                        <span>{dept.manager_name || 'No manager assigned'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-2xl font-bold">{dept.employee_count}</p>
                          <p className="text-xs text-muted-foreground">{t('staffs')}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{dept.budget ? formatCurrency(dept.budget) : '-'}</p>
                          <p className="text-xs text-muted-foreground">Budget</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No departments configured yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Department" to get started
                </p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orgchart">
          <Card>
            <CardHeader>
              <CardTitle>Organization Chart</CardTitle>
              <CardDescription>Visual representation of your organization structure</CardDescription>
            </CardHeader>
            <CardContent>
              {displayDepartments.length > 0 ? (
                <div className="flex flex-col items-center py-8">
                  {/* Company Level */}
                  <div className="p-5 bg-primary/10 rounded-xl border-2 border-primary/20 text-center mb-2 min-w-[220px]">
                    <Building2 className="h-6 w-6 text-primary mx-auto mb-1" />
                    <p className="font-bold text-lg">{tenantConfig?.company_name || 'Organization'}</p>
                    <p className="text-sm text-muted-foreground">{employees?.length || 0} employees · {displayDepartments.length} departments</p>
                  </div>
                  {/* Connector */}
                  <div className="w-px h-8 bg-border" />
                  <div className="w-3/4 h-px bg-border" />
                  {/* Department Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 w-full">
                    {displayDepartments.map((dept) => {
                      const deptEmployees = (employees || []).filter(e => e.department_name === dept.name);
                      const previewEmps = deptEmployees.slice(0, 3);
                      const colors = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
                      const colorIdx = displayDepartments.indexOf(dept) % colors.length;
                      return (
                        <div
                          key={dept.id}
                          className="flex flex-col items-center cursor-pointer group"
                          onClick={() => navigate(`/hr/employees?department=${dept.name}`)}
                        >
                          <div className="w-px h-4 bg-border" />
                          <Card className="w-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                            <div className={`h-1.5 ${colors[colorIdx]}`} />
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{dept.name}</h3>
                                    {dept.code && <Badge variant="secondary" className="text-xs">{dept.code}</Badge>}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                    <UserCircle className="h-3.5 w-3.5" />
                                    <span>{dept.manager_name || 'No manager'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{dept.employee_count} {t('staffs').toLowerCase()}</Badge>
                                  {dept.budget ? <Badge variant="outline">{formatCurrency(dept.budget)}</Badge> : null}
                                </div>
                                {previewEmps.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {previewEmps.map((emp) => (
                                      <Avatar key={emp.id} className="h-7 w-7 ring-2 ring-background">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {deptEmployees.length > 3 && (
                                      <Avatar className="h-7 w-7 ring-2 ring-background">
                                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                          +{deptEmployees.length - 3}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No departments to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {displayDepartments.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Headcount by Department</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayDepartments.map((dept) => {
                    const maxCount = Math.max(...displayDepartments.map(d => d.employee_count), 1);
                    const percentage = (dept.employee_count / maxCount) * 100;
                    return (
                      <div key={dept.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{dept.name}</span>
                          <span className="font-medium">{dept.employee_count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Budget Allocation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayDepartments.map((dept) => {
                    const totalBudget = displayDepartments.reduce((acc, d) => acc + (d.budget || 0), 0) || 1;
                    const percentage = ((dept.budget || 0) / totalBudget) * 100;
                    return (
                      <div key={dept.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{dept.name}</span>
                          <span className="font-medium">{formatCurrency(dept.budget || 0)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-chart-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No data available for analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Department Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                value={editDept.name}
                onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department Code</Label>
              <Input
                value={editDept.code}
                onChange={(e) => setEditDept({ ...editDept, code: e.target.value.toUpperCase() })}
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Department Manager</Label>
              <Select
                value={editDept.manager_id}
                onValueChange={(value) => setEditDept({ ...editDept, manager_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || [])
                    .filter(e => e.employment_status === 'active')
                    .map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name || `${e.first_name} ${e.last_name}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditDepartment} disabled={updateDepartment.isPending}>
              {updateDepartment.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
