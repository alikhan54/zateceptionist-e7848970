import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Phone, Mail, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Lead } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onCall?: (lead: Lead) => void;
  onEmail?: (lead: Lead) => void;
  onSchedule?: (lead: Lead) => void;
}

const scoreColors = {
  hot: 'bg-red-500',
  warm: 'bg-orange-500',
  cold: 'bg-blue-500',
};

function getScoreLevel(score?: number): 'hot' | 'warm' | 'cold' {
  if (!score) return 'cold';
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function LeadCard({ lead, onEdit, onCall, onEmail, onSchedule }: LeadCardProps) {
  const initials = lead.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const scoreLevel = getScoreLevel(lead.score);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {lead.score && (
                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ${scoreColors[scoreLevel]} flex items-center justify-center`}>
                  <span className="text-[8px] font-bold text-white">{lead.score}</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-sm">{lead.name}</h4>
              <p className="text-xs text-muted-foreground">{lead.source}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(lead)}>Edit</DropdownMenuItem>
              <DropdownMenuItem>Convert to Deal</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-1 mb-3">
          <Badge variant="outline" className="text-[10px]">
            {lead.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {lead.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onCall?.(lead);
              }}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}
          {lead.email && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEmail?.(lead);
              }}
            >
              <Mail className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onSchedule?.(lead);
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
