import { useState, useRef, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useHRAI } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Bot, 
  Send,
  Mic,
  MicOff,
  Calendar,
  FileText,
  Users,
  Clock,
  DollarSign,
  HelpCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const { t, tenantConfig } = useTenant();
  const { sendMessage } = useHRAI();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your HR AI Assistant. I can help you with:\n\n• Checking leave balances and requesting time off\n• Viewing payslips and salary information\n• Finding employee information\n• Understanding company policies\n• Answering HR-related questions\n\nHow can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickActions = [
    { label: 'Check Leave Balance', icon: Calendar, query: 'What is my current leave balance?' },
    { label: 'Request Leave', icon: Clock, query: 'I want to request leave for next week' },
    { label: 'View Payslip', icon: DollarSign, query: 'Show me my latest payslip' },
    { label: 'Find Employee', icon: Users, query: 'Find employee in Engineering department' },
    { label: 'Company Policies', icon: FileText, query: 'What is the remote work policy?' },
    { label: 'Help', icon: HelpCircle, query: 'What can you help me with?' },
  ];

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the actual webhook
      const result = await sendMessage(inputValue.trim(), {
        channel: 'web'
      });

      let responseContent = "I'm sorry, I couldn't process your request. Please try again.";

      if (result?.success && result?.data) {
        // Use the real AI response from the webhook
        const data = result.data as Record<string, unknown>;
        responseContent = (data.response as string) || (data.message as string) || (data.response_message as string) || JSON.stringify(data);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('HR AI error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // Voice input would be implemented here
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            HR AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Your intelligent HR helper
          </p>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-4 gap-4 min-h-0">
        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={cn(
                      message.role === 'assistant' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    )}>
                      {message.role === 'assistant' ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        'U'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 max-w-[80%]',
                      message.role === 'assistant'
                        ? 'bg-muted'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className={cn(
                      'text-xs mt-2',
                      message.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                    )}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleListening}
                className={cn(isListening && 'bg-destructive text-destructive-foreground')}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                ref={inputRef}
                placeholder="Ask me anything about HR..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="w-full justify-start gap-2 text-left h-auto py-3"
                  onClick={() => handleQuickAction(action.query)}
                >
                  <action.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>"How many sick days do I have left?"</p>
                <p>"What's the maternity leave policy?"</p>
                <p>"Who is my department head?"</p>
                <p>"When is the next payroll date?"</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">AI-Powered</span>
              </div>
              <p className="text-xs text-muted-foreground">
                I use AI to understand your questions and provide accurate, context-aware responses based on your company's HR data and policies.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
