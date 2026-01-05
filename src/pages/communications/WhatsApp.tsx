import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Settings2, Send } from 'lucide-react';

export default function WhatsAppHub() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground mt-1">WhatsApp Business messaging</p>
        </div>
        <Button variant="outline"><Settings2 className="h-4 w-4 mr-2" />Settings</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Active Chats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Send className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Messages Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No WhatsApp conversations</p>
            <p className="text-sm">Connect WhatsApp Business to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
