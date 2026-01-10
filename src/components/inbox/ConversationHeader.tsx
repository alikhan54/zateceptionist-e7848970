import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  Mail,
  MessageSquare,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  Star,
  StarOff,
  User,
  Bot,
  ClipboardList,
  Tag,
  Users,
  Eye,
  Ban,
  MailOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  channel: string;
  status: string;
  handler_type: string;
  tags?: string[];
}

interface ConversationHeaderProps {
  conversation: Conversation;
  onResolve: () => void;
  onEscalate: () => void;
  onCreateTask: () => void;
  onSetSource: (source: string) => void;
  onAssignStaff: (staffId: string) => void;
  onMarkAIHandled: () => void;
  onToggleStar: () => void;
  onMarkUnread: () => void;
  onViewProfile: () => void;
  onBlockCustomer: () => void;
  onToggleDetails: () => void;
  isStarred?: boolean;
  showDetails?: boolean;
  staffList?: { id: string; name: string }[];
}

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  sms: Phone,
  voice: Phone,
  web: MessageSquare,
};

const channelColors: Record<string, string> = {
  whatsapp: 'text-green-500',
  email: 'text-blue-500',
  instagram: 'text-pink-500',
  facebook: 'text-blue-600',
  linkedin: 'text-blue-700',
  twitter: 'text-foreground',
  sms: 'text-purple-500',
  voice: 'text-orange-500',
  web: 'text-muted-foreground',
};

const MARKETING_SOURCES = [
  'Website',
  'Referral',
  'Social Media',
  'Google Ads',
  'Facebook Ads',
  'Instagram',
  'Walk-in',
  'Phone Inquiry',
  'Email Campaign',
  'Other',
];

export function ConversationHeader({
  conversation,
  onResolve,
  onEscalate,
  onCreateTask,
  onSetSource,
  onAssignStaff,
  onMarkAIHandled,
  onToggleStar,
  onMarkUnread,
  onViewProfile,
  onBlockCustomer,
  onToggleDetails,
  isStarred = false,
  showDetails = true,
  staffList = [],
}: ConversationHeaderProps) {
  const ChannelIcon = channelIcons[conversation.channel] || MessageSquare;
  const channelColor = channelColors[conversation.channel] || 'text-muted-foreground';

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isResolved = conversation.status === 'resolved';
  const isEscalated = conversation.status === 'escalated';

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      {/* Left: Customer Info */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(conversation.customer_name)}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            'absolute -bottom-1 -right-1 p-0.5 bg-background rounded-full',
            channelColor
          )}>
            <ChannelIcon className="h-3 w-3" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {conversation.customer_name || conversation.customer_phone || 'Unknown'}
            </span>
            {isStarred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {conversation.customer_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {conversation.customer_phone}
              </span>
            )}
            {conversation.customer_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {conversation.customer_email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={isResolved ? 'secondary' : 'default'}
          size="sm"
          onClick={onResolve}
          disabled={isResolved}
          className="gap-1"
        >
          <CheckCircle className="h-4 w-4" />
          {isResolved ? 'Resolved' : 'Resolve'}
        </Button>

        <Button
          variant={isEscalated ? 'secondary' : 'outline'}
          size="sm"
          onClick={onEscalate}
          disabled={isEscalated}
          className="gap-1"
        >
          <AlertTriangle className="h-4 w-4" />
          {isEscalated ? 'Escalated' : 'Escalate'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onCreateTask}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Create Task
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag className="h-4 w-4 mr-2" />
                Set Marketing Source
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {MARKETING_SOURCES.map((source) => (
                  <DropdownMenuItem key={source} onClick={() => onSetSource(source)}>
                    {source}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Users className="h-4 w-4 mr-2" />
                Assign to Staff
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {staffList.length > 0 ? (
                  staffList.map((staff) => (
                    <DropdownMenuItem key={staff.id} onClick={() => onAssignStaff(staff.id)}>
                      {staff.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No staff available</DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem onClick={onMarkAIHandled}>
              <Bot className="h-4 w-4 mr-2" />
              Mark as Handled by AI
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onToggleStar}>
              {isStarred ? (
                <>
                  <StarOff className="h-4 w-4 mr-2" />
                  Unstar Conversation
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Star Conversation
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onMarkUnread}>
              <MailOpen className="h-4 w-4 mr-2" />
              Mark as Unread
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onViewProfile}>
              <Eye className="h-4 w-4 mr-2" />
              View Customer Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onBlockCustomer} className="text-destructive">
              <Ban className="h-4 w-4 mr-2" />
              Block Customer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDetails}
        >
          {showDetails ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
