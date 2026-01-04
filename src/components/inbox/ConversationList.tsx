import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Instagram, Facebook } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  customer_name: string;
  last_message: string;
  channel: 'whatsapp' | 'email' | 'instagram' | 'facebook';
  status: 'open' | 'pending' | 'resolved';
  unread_count: number;
  last_message_at: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const channelIcons = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  facebook: Facebook,
};

const channelColors = {
  whatsapp: 'text-green-500',
  email: 'text-blue-500',
  instagram: 'text-pink-500',
  facebook: 'text-blue-600',
};

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="flex flex-col divide-y">
      {conversations.map((conversation) => {
        const Icon = channelIcons[conversation.channel];
        const initials = conversation.customer_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              'flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors',
              selectedId === conversation.id && 'bg-muted'
            )}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className={cn('absolute -bottom-1 -right-1 p-0.5 bg-background rounded-full', channelColors[conversation.channel])}>
                <Icon className="h-3 w-3" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{conversation.customer_name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {conversation.last_message}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={conversation.status === 'open' ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {conversation.status}
                </Badge>
                {conversation.unread_count > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
