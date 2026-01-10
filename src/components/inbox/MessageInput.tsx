import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  quickReplies?: string[];
  onQuickReply?: (reply: string) => void;
  isSending?: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '😊', '😂', '🙏', '👏', '🎉', '✅', '💯', '🔥', '⭐', '💪'];

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  quickReplies = [],
  onQuickReply,
  isSending = false,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled && !isSending) {
      onSend(message.trim());
      setMessage('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleQuickReply = (reply: string) => {
    if (onQuickReply) {
      onQuickReply(reply);
    } else {
      setMessage(reply);
    }
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      {/* Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
          >
            <Sparkles className="h-3 w-3 text-primary" />
            AI Suggestions
          </Button>
          {showQuickReplies && (
            <div className="flex flex-wrap gap-2">
              {quickReplies.slice(0, 3).map((reply, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply.length > 40 ? reply.slice(0, 40) + '...' : reply}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={disabled}
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="grid grid-cols-6 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-2 hover:bg-muted rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'min-h-[44px] max-h-32 resize-none pr-12',
              'focus-visible:ring-1 focus-visible:ring-primary'
            )}
          />
        </div>

        {/* Send Button */}
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
        >
          {isSending ? (
            <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
