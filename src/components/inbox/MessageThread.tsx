import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_type: 'customer' | 'agent' | 'ai';
  content: string;
  created_at: string;
}

interface MessageThreadProps {
  messages: Message[];
  customerName?: string;
}

export function MessageThread({ messages, customerName = 'Customer' }: MessageThreadProps) {
  const customerInitials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => {
        const isCustomer = message.sender_type === 'customer';
        const isAI = message.sender_type === 'ai';

        return (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 max-w-[80%]',
              !isCustomer && 'ml-auto flex-row-reverse'
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className={cn(
                isCustomer ? 'bg-muted' : isAI ? 'bg-primary/10 text-primary' : 'bg-secondary'
              )}>
                {isCustomer ? customerInitials : isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div className={cn(
              'flex flex-col gap-1',
              !isCustomer && 'items-end'
            )}>
              <div className={cn(
                'rounded-2xl px-4 py-2',
                isCustomer
                  ? 'bg-muted rounded-tl-sm'
                  : isAI
                  ? 'bg-primary/10 text-primary-foreground rounded-tr-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm'
              )}>
                <p className="text-sm">{message.content}</p>
              </div>
              <span className="text-[10px] text-muted-foreground px-1">
                {format(new Date(message.created_at), 'HH:mm')}
                {isAI && ' • AI'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
