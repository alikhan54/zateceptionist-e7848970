import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Phone,
  Globe,
  Search,
  Bot,
  User,
  UserCheck,
  Clock,
  AlertCircle,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  status: string;
  handler_type: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface EnhancedConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
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
  web: Globe,
  telegram: MessageSquare,
};

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  email: 'bg-blue-500',
  instagram: 'bg-gradient-to-tr from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  linkedin: 'bg-blue-700',
  twitter: 'bg-foreground',
  sms: 'bg-purple-500',
  voice: 'bg-orange-500',
  web: 'bg-muted-foreground',
  telegram: 'bg-sky-400',
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-green-500', label: 'Active' },
  pending: { color: 'bg-yellow-500', label: 'Pending' },
  escalated: { color: 'bg-red-500', label: 'Escalated' },
  resolved: { color: 'bg-gray-400', label: 'Resolved' },
};

const handlerIcons: Record<string, React.ReactNode> = {
  ai: <Bot className="h-3 w-3 text-primary" />,
  agent: <User className="h-3 w-3 text-blue-500" />,
  staff: <User className="h-3 w-3 text-blue-500" />,
  manager: <UserCheck className="h-3 w-3 text-green-500" />,
};

type FilterTab = 'all' | 'unread' | 'ai' | 'staff';

export function EnhancedConversationList({
  conversations,
  selectedId,
  onSelect,
  onRefresh,
  isLoading = false,
}: EnhancedConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer_phone?.includes(searchQuery) ||
      conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab filter
    let matchesTab = true;
    switch (activeFilter) {
      case 'unread':
        matchesTab = conv.unread_count > 0;
        break;
      case 'ai':
        matchesTab = conv.handler_type === 'ai';
        break;
      case 'staff':
        matchesTab = conv.handler_type !== 'ai';
        break;
    }

    return matchesSearch && matchesTab;
  });

  return (
    <div className="h-full flex flex-col border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading && conversations.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium">No conversations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? 'No conversations match your search'
                : 'Messages will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
              const channelBg = channelColors[conv.channel] || 'bg-muted-foreground';
              const status = statusConfig[conv.status] || statusConfig.active;
              const isSelected = selectedId === conv.id;
              const hasUnread = conv.unread_count > 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 text-left transition-colors',
                    'hover:bg-muted/50',
                    isSelected && 'bg-muted border-l-2 border-l-primary',
                    hasUnread && !isSelected && 'bg-primary/5'
                  )}
                >
                  {/* Avatar with channel badge */}
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={cn(
                        'text-sm',
                        hasUnread && 'bg-primary/10 text-primary font-semibold'
                      )}>
                        {getInitials(conv.customer_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'absolute -bottom-1 -right-1 p-1 rounded-full text-white',
                      channelBg
                    )}>
                      <ChannelIcon className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Name & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'font-medium truncate',
                        hasUnread && 'font-semibold'
                      )}>
                        {conv.customer_name || conv.customer_phone || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
                          : ''}
                      </span>
                    </div>

                    {/* Last message - 2 lines */}
                    <p className={cn(
                      'text-sm line-clamp-2',
                      hasUnread ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {conv.last_message || 'No messages yet'}
                    </p>

                    {/* Status, Handler, Unread */}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 border-0',
                          status.color,
                          'text-white'
                        )}
                      >
                        {status.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {handlerIcons[conv.handler_type] || handlerIcons.ai}
                      </div>
                      {hasUnread && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
