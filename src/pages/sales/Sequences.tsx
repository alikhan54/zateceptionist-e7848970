import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Workflow, Plus, Play, Pause, Copy, MoreHorizontal, Mail, Phone, 
  MessageSquare, Linkedin, Clock, ArrowRight, Trash2, Edit, 
  BarChart3, Users, CheckCircle2, XCircle, GitBranch, Zap,
  Settings2, Eye, Send
} from 'lucide-react';

interface SequenceStep {
  id: string;
  type: 'email' | 'call' | 'linkedin' | 'sms' | 'wait';
  title: string;
  content?: string;
  waitDays?: number;
  condition?: string;
}

interface Sequence {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  steps: SequenceStep[];
  leadsEnrolled: number;
  completed: number;
  replied: number;
  openRate: number;
  replyRate: number;
}

const stepIcons = {
  email: Mail,
  call: Phone,
  linkedin: Linkedin,
  sms: MessageSquare,
  wait: Clock
};

const stepColors = {
  email: 'bg-blue-500',
  call: 'bg-green-500',
  linkedin: 'bg-indigo-500',
  sms: 'bg-purple-500',
  wait: 'bg-gray-400'
};

export default function Sequences() {
  const [activeTab, setActiveTab] = useState('library');
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  // Mock sequences
  const sequences: Sequence[] = [
    {
      id: '1',
      name: 'Cold Outreach - SaaS',
      status: 'active',
      steps: [
        { id: 's1', type: 'email', title: 'Initial outreach', content: 'Hi {{first_name}}...' },
        { id: 's2', type: 'wait', title: 'Wait', waitDays: 3 },
        { id: 's3', type: 'email', title: 'Follow-up 1', content: 'Just following up...' },
        { id: 's4', type: 'wait', title: 'Wait', waitDays: 2 },
        { id: 's5', type: 'linkedin', title: 'LinkedIn connect' },
        { id: 's6', type: 'wait', title: 'Wait', waitDays: 3 },
        { id: 's7', type: 'call', title: 'Discovery call' },
      ],
      leadsEnrolled: 145,
      completed: 89,
      replied: 23,
      openRate: 42,
      replyRate: 16
    },
    {
      id: '2',
      name: 'Warm Lead Nurture',
      status: 'active',
      steps: [
        { id: 's1', type: 'email', title: 'Thank you email' },
        { id: 's2', type: 'wait', title: 'Wait', waitDays: 2 },
        { id: 's3', type: 'email', title: 'Case study share' },
        { id: 's4', type: 'wait', title: 'Wait', waitDays: 3 },
        { id: 's5', type: 'call', title: 'Check-in call' },
      ],
      leadsEnrolled: 67,
      completed: 42,
      replied: 18,
      openRate: 58,
      replyRate: 27
    },
    {
      id: '3',
      name: 'Enterprise Outbound',
      status: 'paused',
      steps: [
        { id: 's1', type: 'email', title: 'Executive intro' },
        { id: 's2', type: 'wait', title: 'Wait', waitDays: 4 },
        { id: 's3', type: 'linkedin', title: 'LinkedIn message' },
        { id: 's4', type: 'wait', title: 'Wait', waitDays: 3 },
        { id: 's5', type: 'email', title: 'Value proposition' },
        { id: 's6', type: 'wait', title: 'Wait', waitDays: 5 },
        { id: 's7', type: 'call', title: 'Executive call' },
      ],
      leadsEnrolled: 34,
      completed: 12,
      replied: 8,
      openRate: 35,
      replyRate: 24
    },
    {
      id: '4',
      name: 'Re-engagement Campaign',
      status: 'draft',
      steps: [
        { id: 's1', type: 'email', title: 'We miss you' },
        { id: 's2', type: 'wait', title: 'Wait', waitDays: 7 },
        { id: 's3', type: 'email', title: 'Special offer' },
      ],
      leadsEnrolled: 0,
      completed: 0,
      replied: 0,
      openRate: 0,
      replyRate: 0
    },
  ];

  const SequenceCard = ({ sequence }: { sequence: Sequence }) => {
    const StepIcon = stepIcons[sequence.steps[0]?.type || 'email'];
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-all"
        onClick={() => setSelectedSequence(sequence)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{sequence.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {sequence.steps.length} steps
                </p>
              </div>
            </div>
            <Badge variant={
              sequence.status === 'active' ? 'default' :
              sequence.status === 'paused' ? 'secondary' : 'outline'
            }>
              {sequence.status}
            </Badge>
          </div>

          {/* Steps Preview */}
          <div className="flex items-center gap-1 mb-4 overflow-hidden">
            {sequence.steps.slice(0, 6).map((step, i) => {
              const Icon = stepIcons[step.type];
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`p-1.5 rounded ${stepColors[step.type]} text-white`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  {i < sequence.steps.length - 1 && i < 5 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
            {sequence.steps.length > 6 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{sequence.steps.length - 6}
              </span>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold">{sequence.leadsEnrolled}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div>
              <p className="text-lg font-bold">{sequence.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{sequence.openRate}%</p>
              <p className="text-xs text-muted-foreground">Open Rate</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{sequence.replyRate}%</p>
              <p className="text-xs text-muted-foreground">Reply Rate</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            {sequence.status === 'active' ? (
              <Button variant="outline" size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            ) : sequence.status === 'paused' ? (
              <Button size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            ) : (
              <Button size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Play className="h-4 w-4 mr-1" />
                Activate
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Sequences</h1>
          <p className="text-muted-foreground mt-1">Automated multi-channel outreach workflows</p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">Sequence Library</TabsTrigger>
          <TabsTrigger value="active">Active Sequences</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sequences.map(sequence => (
              <SequenceCard key={sequence.id} sequence={sequence} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {/* Active Sequences Dashboard */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">246</p>
                    <p className="text-sm text-muted-foreground">Active Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">1,234</p>
                    <p className="text-sm text-muted-foreground">Emails Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">49</p>
                    <p className="text-sm text-muted-foreground">Replies</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                    <XCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-sm text-muted-foreground">Bounced</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Sequence List */}
          <Card>
            <CardHeader>
              <CardTitle>Currently Running</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sequences.filter(s => s.status === 'active').map(sequence => (
                  <div key={sequence.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Workflow className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{sequence.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {sequence.leadsEnrolled} leads enrolled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">Progress</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(sequence.completed / sequence.leadsEnrolled) * 100} className="w-24 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {Math.round((sequence.completed / sequence.leadsEnrolled) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Rates by Step</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Step 1: Initial Email', 'Step 3: Follow-up 1', 'Step 5: Case Study'].map((step, i) => (
                    <div key={step}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{step}</span>
                        <span className="font-medium">{[42, 38, 31][i]}%</span>
                      </div>
                      <Progress value={[42, 38, 31][i]} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reply Rates by Step</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Step 1: Initial Email', 'Step 3: Follow-up 1', 'Step 5: Case Study'].map((step, i) => (
                    <div key={step}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{step}</span>
                        <span className="font-medium">{[8, 12, 18][i]}%</span>
                      </div>
                      <Progress value={[8, 12, 18][i]} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Performing Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { day: 'Tuesday', time: '10:00 AM', rate: '24%' },
                    { day: 'Wednesday', time: '2:00 PM', rate: '21%' },
                    { day: 'Thursday', time: '11:00 AM', rate: '19%' },
                  ].map((slot, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{slot.day}</p>
                        <p className="text-sm text-muted-foreground">{slot.time}</p>
                      </div>
                      <Badge variant="secondary">{slot.rate} reply rate</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { channel: 'Email', icon: Mail, replies: 34, color: 'text-blue-500' },
                    { channel: 'LinkedIn', icon: Linkedin, replies: 12, color: 'text-indigo-500' },
                    { channel: 'Phone', icon: Phone, replies: 8, color: 'text-green-500' },
                    { channel: 'SMS', icon: MessageSquare, replies: 5, color: 'text-purple-500' },
                  ].map(channel => (
                    <div key={channel.channel} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <channel.icon className={`h-5 w-5 ${channel.color}`} />
                        <span className="font-medium">{channel.channel}</span>
                      </div>
                      <span className="font-bold">{channel.replies} replies</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sequence Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Sequence Name</Label>
              <Input placeholder="e.g., Cold Outreach - Enterprise" />
            </div>

            <div>
              <Label className="mb-3 block">Sequence Steps</Label>
              <div className="space-y-3">
                {/* Step 1 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Email - Initial Outreach</p>
                        <p className="text-sm text-muted-foreground">Day 1</p>
                      </div>
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Step Button */}
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </div>

                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
              <Button>Create Sequence</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
