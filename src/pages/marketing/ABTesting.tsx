import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useABTests } from '@/hooks/useABTests';
import { GitBranch, Plus, Play, Square, Trophy, BarChart3 } from 'lucide-react';

export default function ABTesting() {
  const { tests, isLoading, stats, createTest, startTest, endTest } = useABTests();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [testType, setTestType] = useState('subject_line');

  const handleCreate = async () => {
    if (!testName.trim()) return;
    try {
      await createTest.mutateAsync({
        name: testName,
        test_type: testType,
        variants: [
          { id: 'a', name: 'Variant A', config: {}, sent: 0, opened: 0, clicked: 0 },
          { id: 'b', name: 'Variant B', config: {}, sent: 0, opened: 0, clicked: 0 },
        ],
      });
      setIsCreateOpen(false);
      setTestName('');
    } catch {}
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    running: 'bg-green-500/10 text-green-500',
    paused: 'bg-yellow-500/10 text-yellow-500',
    completed: 'bg-blue-500/10 text-blue-500',
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">Optimize with data-driven experiments</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Test</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Tests</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-500">{stats.running}</p><p className="text-xs text-muted-foreground">Running</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-blue-500">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No A/B tests yet</p>
            <p className="text-sm">Create your first test to optimize your campaigns</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test: any) => {
            const variants = Array.isArray(test.variants) ? test.variants : [];
            return (
              <Card key={test.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{test.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">{(test.test_type || '').replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[test.status] || ''}>{test.status}</Badge>
                      {test.status === 'draft' && (
                        <Button size="sm" onClick={() => startTest.mutateAsync(test.id)}>
                          <Play className="h-3 w-3 mr-1" />Start
                        </Button>
                      )}
                      {test.status === 'running' && variants.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => endTest.mutateAsync({ testId: test.id, winnerId: variants[0]?.id || 'a' })}>
                          <Square className="h-3 w-3 mr-1" />End Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {variants.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {variants.map((v: any, i: number) => (
                        <div key={v.id || i} className={`p-3 rounded-lg ${test.winner_variant === v.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{v.name || `Variant ${String.fromCharCode(65 + i)}`}</p>
                            {test.winner_variant === v.id && <Trophy className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div><p className="text-lg font-bold">{v.sent || 0}</p><p className="text-xs text-muted-foreground">Sent</p></div>
                            <div><p className="text-lg font-bold">{v.opened || 0}</p><p className="text-xs text-muted-foreground">Opened</p></div>
                            <div><p className="text-lg font-bold">{v.clicked || 0}</p><p className="text-xs text-muted-foreground">Clicked</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No variants configured</p>
                  )}
                  {test.statistical_significance && (
                    <p className="text-xs text-muted-foreground mt-2">Statistical significance: {test.statistical_significance}%</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create A/B Test</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Name</Label>
              <Input placeholder="e.g., Subject Line Test" value={testName} onChange={(e) => setTestName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Test Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject_line">Subject Line</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="send_time">Send Time</SelectItem>
                  <SelectItem value="cta">Call to Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTest.isPending}>{createTest.isPending ? 'Creating...' : 'Create Test'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
