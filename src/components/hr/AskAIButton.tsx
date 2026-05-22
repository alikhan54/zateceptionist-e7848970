import { Button, type ButtonProps } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AskAIButtonProps {
  context?: string;
  message?: string;
  label?: string;
  className?: string;
  // Accept (and pass through) the underlying Button visual props so existing
  // call sites that customise size/variant keep working.
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
}

export function AskAIButton({
  message,
  label = 'Ask AI',
  className,
  size = 'sm',
  variant = 'outline',
}: AskAIButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => navigate('/hr/ai-assistant', { state: { prefillMessage: message } })}
    >
      <Bot size={14} className="mr-1" />
      {label}
    </Button>
  );
}
