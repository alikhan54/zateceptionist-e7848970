import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useABTests } from '@/hooks/useABTests';
import { cn } from '@/lib/utils';
import { GitBranch, Plus, Play, Square, Trophy, BarChart3, Lightbulb, Sparkles } from 'lucide-react';

export default function ABTesting() {
  const { tests, isLoading, stats, createTest, startTest, endTest } = useABTests();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [testType, setTestType] = useState('subject_line');
  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');

  const handleCreate = async () => {
    if (!testName.trim() || !variantA.trim() || !variantB.trim()) return;
    try {
      await createTest.mutateAsync({
        name: testName,
        test_type: testType,
        variants: [
          { id: 'a', name: 'Variant A', config: { content: variantA }, sent: 0, opened: 0, clicked: 0 },
          { id: 'b', name: 'Variant B', config: { content: variantB }, sent: 0, opened: 0, clicked: 0 },
        ],
      });
      setIsCreateOpen(false);
      setTestName('');
      setVariantA('');
      setVariantB('');
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

      {/* How A/B Testing Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            How A/B Testing Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '1', label: 'Create Variants', desc: 'Two versions of your content', color: 'bg-primary/20 text-primary' },
              { step: '2', label: 'Split Audience', desc: '50% see A, 50% see B', color: 'bg-secondary text-secondary-foreground' },
              { step: '3', label: 'Measure Results', desc: 'Track opens, clicks, conversions', color: 'bg-accent text-accent-foreground' },
              { step: '4', label: 'AI Picks Winner', desc: 'Best version auto-selected', color: 'bg-muted text-muted-foreground' },
            ].map((item) => (
              <div key={item.step} className="text-center p-4">
                <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center mx-auto mb-2`}>
                  <span className="font-bold">{item.step}</span>
                </div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggested Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggested Tests
          </CardTitle>
          <CardDescription>Based on your industry and audience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: 'Subject Line Test', desc: 'Question vs Statement - 23% avg improvement', type: 'subject_line', a: 'Discover our new services', b: 'Ready to transform your business?' },
            { name: 'CTA Button Test', desc: 'Action vs Benefit - 18% avg improvement', type: 'cta', a: 'Get Started', b: 'Start Saving Today' },
            { name: 'Send Time Test', desc: 'Morning vs Afternoon - Industry specific', type: 'send_time', a: '9:00 AM', b: '2:00 PM' },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Button size="sm" onClick={() => { setTestType(item.type); setVariantA(item.a); setVariantB(item.b); setTestName(item.name); setIsCreateOpen(true); }}>
                Use This
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tests List */}
      {tests.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/20 mb-4">
              <GitBranch className="h-12 w-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No A/B Tests Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first A/B test to optimize your campaigns. Test different subject lines,
              content variations, or send times to improve engagement.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Test
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tests.map((test: any) => {
            const variants = Array.isArray(test.variants) ? test.variants : [];
            const rates = variants.map((v: any) => v.sent > 0 ? (v.opened / v.sent) * 100 : 0);
            const winnerIdx = rates.length >= 2 && rates[0] !== rates[1] ? (rates[0] > rates[1] ? 0 : 1) : -1;

            return (
              <Card key={test.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <Badge className={statusColors[test.status] || ''}>{test.status}</Badge>
                  </div>
                  <CardDescription>Type: {(test.test_type || '').replace('_', ' ')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variants.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {variants.map((v: any, i: number) => {
                        const openRate = v.sent > 0 ? ((v.opened / v.sent) * 100).toFixed(1) : '0';
                        const isWinner = winnerIdx === i;
                        return (
                          <div
                            key={v.id || i}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all",
                              isWinner || test.winner_variant === v.id
                                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                : "border-muted bg-muted/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold">{v.name || `Variant ${String.fromCharCode(65 + i)}`}</p>
                              {(isWinner || test.winner_variant === v.id) && <Trophy className="h-4 w-4 text-green-500" />}
                            </div>
                            {(v.config?.content || v.content) && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{v.config?.content || v.content}</p>
                            )}
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span className="text-muted-foreground">Sent:</span><span>{v.sent || 0}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Opened:</span><span>{v.opened || 0}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Clicked:</span><span>{v.clicked || 0}</span></div>
                              <div className="flex justify-between font-medium">
                                <span className="text-muted-foreground">Rate:</span>
                                <span className={isWinner || test.winner_variant === v.id ? 'text-green-500' : ''}>{openRate}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No variants configured</p>
                  )}
                  {test.statistical_significance && (
                    <p className="text-xs text-muted-foreground">Statistical significance: {test.statistical_significance}%</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    {test.status === 'draft' && (
                      <Button size="sm" className="flex-1" onClick={() => startTest.mutateAsync(test.id)}>
                        <Play className="h-3 w-3 mr-1" /> Start Test
                      </Button>
                    )}
                    {test.status === 'running' && variants.length > 0 && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => endTest.mutateAsync({ testId: test.id, winnerId: variants[0]?.id || 'a' })}>
                        <Square className="h-3 w-3 mr-1" /> End Test
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <BarChart3 className="h-3 w-3 mr-1" /> Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
            <DialogDescription>Test different versions to optimize performance</DialogDescription>
          </DialogHeader>
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
                  <SelectItem value="from_name">From Name</SelectItem>
                  <SelectItem value="hero_image">Hero Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variant A (Control)</Label>
                <Textarea
                  value={variantA}
                  onChange={(e) => setVariantA(e.target.value)}
                  placeholder="Original version..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Variant B (Test)</Label>
                <Textarea
                  value={variantB}
                  onChange={(e) => setVariantB(e.target.value)}
                  placeholder="New version to test..."
                  rows={4}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createTest.isPending || !testName.trim() || !variantA.trim() || !variantB.trim()}
              className="marketing-gradient text-white"
            >
              {createTest.isPending ? 'Creating...' : 'Create Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
