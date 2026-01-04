import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Play, Pause, Mail, MessageSquare, Phone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Campaign } from '@/types';
import { format } from 'date-fns';

interface CampaignCardProps {
  campaign: Campaign;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
}

const typeIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
  social: MessageSquare,
};

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-500/10 text-blue-500',
  active: 'bg-green-500/10 text-green-500',
  paused: 'bg-yellow-500/10 text-yellow-500',
  completed: 'bg-muted text-muted-foreground',
};

export function CampaignCard({ campaign, onPause, onResume, onEdit }: CampaignCardProps) {
  const Icon = typeIcons[campaign.type];
  const progress = campaign.audience_count > 0 
    ? Math.round((campaign.sent_count / campaign.audience_count) * 100) 
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{campaign.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={statusColors[campaign.status]}>
                  {campaign.status}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">
                  {campaign.type}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(campaign)}>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>View Report</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sent</span>
              <span className="font-medium">
                {campaign.sent_count.toLocaleString()} / {campaign.audience_count.toLocaleString()}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {campaign.open_rate !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Open Rate</p>
                <p className="text-lg font-semibold">{campaign.open_rate}%</p>
              </div>
            )}
            {campaign.click_rate !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Click Rate</p>
                <p className="text-lg font-semibold">{campaign.click_rate}%</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            {campaign.scheduled_at && (
              <span className="text-xs text-muted-foreground">
                Scheduled: {format(new Date(campaign.scheduled_at), 'MMM d, h:mm a')}
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              {campaign.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPause?.(campaign)}
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </Button>
              )}
              {campaign.status === 'paused' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResume?.(campaign)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Resume
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
