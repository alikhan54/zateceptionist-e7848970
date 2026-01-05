import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserCog, Plus, Mail, Shield } from 'lucide-react';

export default function TeamSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Invite Member</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>People with access to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>Y</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">You</p>
                  <p className="text-sm text-muted-foreground">you@example.com</p>
                </div>
              </div>
              <Badge>Owner</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invitations that haven't been accepted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending invitations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
