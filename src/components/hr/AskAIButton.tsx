import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';

interface AskAIButtonProps {
  context?: string;
  message?: string;
  label?: string;
  className?: string;
}

export function AskAIButton({ context, label = 'Ask AI', className }: AskAIButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => toast.info('AI assistant coming soon')}
    >
      <Bot size={14} className="mr-1" />
      {label}
    </Button>
  );
}