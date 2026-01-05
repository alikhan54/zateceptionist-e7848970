import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Plus, Send } from 'lucide-react';

export default function EmailBuilder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Builder</h1>
          <p className="text-muted-foreground mt-1">Create beautiful email campaigns</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Email</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="p-6 text-center">
            <Mail className="h-10 w-10 mx-auto text-primary mb-3" />
            <p className="font-medium">Blank Template</p>
            <p className="text-sm text-muted-foreground">Start from scratch</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="p-6 text-center">
            <Send className="h-10 w-10 mx-auto text-chart-2 mb-3" />
            <p className="font-medium">Newsletter</p>
            <p className="text-sm text-muted-foreground">Weekly updates template</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="p-6 text-center">
            <Mail className="h-10 w-10 mx-auto text-chart-4 mb-3" />
            <p className="font-medium">Promotional</p>
            <p className="text-sm text-muted-foreground">Sales and offers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>Your saved email templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emails created yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
