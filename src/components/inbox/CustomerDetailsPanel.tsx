import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Tag,
  Plus,
  X,
  ExternalLink,
  Flame,
  Thermometer,
  Snowflake,
  Edit2,
  Save,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CustomerDetailsPanelProps {
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    channel: string;
    tags?: string[];
    lead_score?: number;
    temperature?: 'hot' | 'warm' | 'cold';
    notes?: string;
    created_at?: string;
  } | null;
  onClose?: () => void;
  onViewProfile?: () => void;
  onUpdateTags?: (tags: string[]) => void;
  onUpdateNotes?: (notes: string) => void;
}

const temperatureConfig = {
  hot: { icon: Flame, color: 'text-red-500 bg-red-500/10', label: 'HOT' },
  warm: { icon: Thermometer, color: 'text-orange-500 bg-orange-500/10', label: 'WARM' },
  cold: { icon: Snowflake, color: 'text-blue-500 bg-blue-500/10', label: 'COLD' },
};

const recentActivity = [
  { type: 'message', description: 'Sent inquiry about pricing', time: '2h ago' },
  { type: 'call', description: 'Missed call', time: '1d ago' },
  { type: 'appointment', description: 'Booked consultation', time: '3d ago' },
];

export function CustomerDetailsPanel({
  customer,
  onClose,
  onViewProfile,
  onUpdateTags,
  onUpdateNotes,
}: CustomerDetailsPanelProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(customer?.notes || '');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(customer?.tags || []);

  if (!customer) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4">
        <p className="text-sm text-center">Select a conversation to view customer details</p>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const temp = customer.temperature || 'warm';
  const TempIcon = temperatureConfig[temp].icon;

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      onUpdateTags?.(updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    onUpdateTags?.(updatedTags);
  };

  const handleSaveNotes = () => {
    onUpdateNotes?.(notes);
    setIsEditingNotes(false);
  };

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Customer Details</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Customer Info */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-semibold">{customer.name || 'Unknown'}</h4>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={cn('text-xs', temperatureConfig[temp].color)}>
                <TempIcon className="h-3 w-3 mr-1" />
                {temperatureConfig[temp].label}
              </Badge>
              {customer.lead_score !== undefined && (
                <Badge variant="outline" className="text-xs">
                  Score: {customer.lead_score}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contact Info
            </h5>
            {customer.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{customer.channel}</span>
            </div>
            {customer.created_at && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Customer since {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tags
            </h5>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="h-6 w-20 text-xs"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddTag}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Recent Activity */}
          <div className="space-y-3">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </h5>
            <div className="space-y-2">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1">
                    <p>{activity.description}</p>
                    <p className="text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </h5>
              {isEditingNotes ? (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveNotes}>
                  <Save className="h-3 w-3" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingNotes(true)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingNotes ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this customer..."
                rows={4}
                className="text-xs"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {notes || 'No notes yet. Click the edit icon to add notes.'}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" size="sm" onClick={onViewProfile}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full Profile
        </Button>
      </div>
    </div>
  );
}
