import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Plus, Inbox, Send } from 'lucide-react';

export default function EmailHub() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email</h1>
          <p className="text-muted-foreground mt-1">Manage email communications</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Compose</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Inbox className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Inbox</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Send className="h-8 w-8 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emails</p>
            <p className="text-sm">Connect your email account</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
