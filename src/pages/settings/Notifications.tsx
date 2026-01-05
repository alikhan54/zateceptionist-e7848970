import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageSquare, Phone, Calendar } from 'lucide-react';

export default function NotificationSettings() {
  const notificationTypes = [
    { id: 'email', label: 'Email Notifications', description: 'Receive updates via email', icon: Mail },
    { id: 'push', label: 'Push Notifications', description: 'Browser push notifications', icon: Bell },
    { id: 'sms', label: 'SMS Notifications', description: 'Text message alerts', icon: MessageSquare },
    { id: 'calls', label: 'Call Notifications', description: 'Alerts for incoming calls', icon: Phone },
    { id: 'appointments', label: 'Appointment Reminders', description: 'Reminders before appointments', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-1">Configure how you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type) => (
            <div key={type.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <type.icon className="h-5 w-5" />
                </div>
                <div>
                  <Label>{type.label}</Label>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
              <Switch />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
