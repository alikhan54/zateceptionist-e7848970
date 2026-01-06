import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Mail, 
  Search,
  Phone,
  PhoneCall,
  Globe,
  Send,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Channel configuration with icons and colors
const channels = [
  { id: 'all', label: 'All', icon: MessageSquare, color: 'text-foreground' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-500' },
  { id: 'instagram', label: 'Instagram', icon: MessageSquare, color: 'text-pink-500' },
  { id: 'facebook', label: 'Facebook', icon: MessageSquare, color: 'text-blue-600' },
  { id: 'linkedin', label: 'LinkedIn', icon: MessageSquare, color: 'text-blue-700' },
  { id: 'twitter', label: 'X / Twitter', icon: MessageSquare, color: 'text-foreground' },
  { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-blue-400' },
  { id: 'sms', label: 'SMS', icon: Phone, color: 'text-purple-500' },
  { id: 'voice', label: 'Voice Calls', icon: PhoneCall, color: 'text-orange-500' },
  { id: 'web', label: 'Website Chat', icon: Globe, color: 'text-muted-foreground' },
];

// Mock conversations
const mockConversations = [
  { id: '1', name: 'John Smith', channel: 'whatsapp', lastMessage: 'Thanks for the quick response!', time: '2m', unread: true },
  { id: '2', name: 'Sarah Johnson', channel: 'email', lastMessage: 'Can we schedule a call for tomorrow?', time: '15m', unread: true },
  { id: '3', name: 'Mike Wilson', channel: 'instagram', lastMessage: 'Love your products! 🎉', time: '1h', unread: false },
  { id: '4', name: 'Emily Davis', channel: 'linkedin', lastMessage: 'Interested in your services', time: '2h', unread: false },
  { id: '5', name: 'Alex Turner', channel: 'telegram', lastMessage: 'Got it, will check and get back', time: '3h', unread: false },
];

export default function InboxPage() {
  const { tenantConfig } = useTenant();
  const [activeChannel, setActiveChannel] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if a channel is connected (mock implementation)
  const isChannelConnected = (channelId: string): boolean => {
    if (channelId === 'all' || channelId === 'web') return true;
    // In real app, check tenantConfig for channel connections
    const connectedChannels = ['whatsapp', 'email', 'instagram', 'facebook'];
    return connectedChannels.includes(channelId);
  };

  // Filter conversations by channel
  const filteredConversations = mockConversations.filter(conv => {
    if (activeChannel !== 'all' && conv.channel !== activeChannel) return false;
    if (searchQuery && !conv.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Get channel info
  const getChannelInfo = (channelId: string) => {
    return channels.find(c => c.id === channelId) || channels[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            Manage conversations from all channels
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <CheckSquare className="h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <Tabs value={activeChannel} onValueChange={setActiveChannel} className="space-y-4">
        {/* Scrollable Channel Tabs */}
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1">
            {channels.map((channel) => {
              const connected = isChannelConnected(channel.id);
              return (
                <TabsTrigger 
                  key={channel.id} 
                  value={channel.id} 
                  className={cn(
                    "gap-2 data-[state=active]:bg-background",
                    !connected && "opacity-60"
                  )}
                >
                  <channel.icon className={cn("h-4 w-4", channel.color)} />
                  <span className="hidden sm:inline">{channel.label}</span>
                  {!connected && channel.id !== 'all' && (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversation List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
                      const channelInfo = getChannelInfo(conv.channel);
                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv.id)}
                          className={cn(
                            "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                            selectedConversation === conv.id && "bg-muted/50",
                            conv.unread && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0 relative">
                              {conv.name.charAt(0)}
                              <channelInfo.icon className={cn(
                                "h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5",
                                channelInfo.color
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={cn(
                                  "font-medium truncate",
                                  conv.unread && "font-semibold"
                                )}>
                                  {conv.name}
                                </p>
                                <span className="text-xs text-muted-foreground">{conv.time}</span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage}
                              </p>
                            </div>
                            {conv.unread && (
                              <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Conversation View */}
          <Card className="lg:col-span-2">
            <CardContent className="flex items-center justify-center h-[550px] text-muted-foreground">
              {selectedConversation ? (
                <div className="text-center">
                  <p className="font-medium">Conversation View</p>
                  <p className="text-sm">Message thread will appear here</p>
                </div>
              ) : (
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
