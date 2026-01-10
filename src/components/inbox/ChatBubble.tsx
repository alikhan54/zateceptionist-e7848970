import { cn } from '@/lib/utils';
import { Bot, Check, CheckCheck, Clock, User } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatBubbleProps {
  content: string;
  direction: 'inbound' | 'outbound';
  senderType: 'customer' | 'agent' | 'ai';
  senderName?: string | null;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  showSenderName?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function ChatBubble({
  content,
  direction,
  senderType,
  senderName,
  timestamp,
  status = 'delivered',
  showSenderName = true,
  isFirstInGroup = true,
  isLastInGroup = true,
}: ChatBubbleProps) {
  const isInbound = direction === 'inbound';
  const isAI = senderType === 'ai';

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <span className="text-[10px] text-destructive">Failed</span>;
      default:
        return null;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm');
  };

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        isInbound ? 'justify-start' : 'justify-end ml-auto'
      )}
    >
      {/* AI/Agent indicator for outbound */}
      {!isInbound && isAI && isLastInGroup && (
        <div className="flex items-end pb-1">
          <div className="p-1 rounded-full bg-primary/10">
            <Bot className="h-3 w-3 text-primary" />
          </div>
        </div>
      )}

      <div className={cn('flex flex-col', !isInbound && 'items-end')}>
        {/* Sender name */}
        {isInbound && showSenderName && isFirstInGroup && senderName && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'px-4 py-2 text-sm break-words',
            isInbound
              ? cn(
                  'bg-muted text-foreground',
                  isFirstInGroup && 'rounded-t-2xl rounded-tr-2xl',
                  !isFirstInGroup && 'rounded-tr-2xl',
                  isLastInGroup && 'rounded-b-2xl rounded-bl-sm',
                  !isLastInGroup && 'rounded-bl-md',
                  isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tl-sm'
                )
              : cn(
                  isAI ? 'bg-primary/10 text-foreground' : 'bg-primary text-primary-foreground',
                  isFirstInGroup && 'rounded-t-2xl rounded-tl-2xl',
                  !isFirstInGroup && 'rounded-tl-2xl',
                  isLastInGroup && 'rounded-b-2xl rounded-br-sm',
                  !isLastInGroup && 'rounded-br-md',
                  isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tr-sm'
                )
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>

        {/* Timestamp and status */}
        {isLastInGroup && (
          <div className={cn(
            'flex items-center gap-1 mt-1 px-1',
            !isInbound && 'flex-row-reverse'
          )}>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(timestamp)}
            </span>
            {!isInbound && getStatusIcon()}
            {isAI && (
              <span className="text-[10px] text-primary">• AI</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const dateObj = new Date(date);
  
  let label = format(dateObj, 'MMMM d, yyyy');
  if (isToday(dateObj)) {
    label = 'Today';
  } else if (isYesterday(dateObj)) {
    label = 'Yesterday';
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground bg-background px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

interface TypingIndicatorProps {
  senderName?: string;
}

export function TypingIndicator({ senderName = 'AI' }: TypingIndicatorProps) {
  return (
    <div className="flex gap-2 max-w-[85%]">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground mb-1 px-1">
          {senderName} is typing...
        </span>
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
