import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare, Phone, Calendar, Loader2, Save } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type PrefKey = 'email' | 'push' | 'sms' | 'calls' | 'appointments';

const NOTIFICATION_TYPES: { id: PrefKey; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'email', label: 'Email Notifications', description: 'Receive updates via email', icon: Mail },
  { id: 'push', label: 'Push Notifications', description: 'Browser push notifications', icon: Bell },
  { id: 'sms', label: 'SMS Notifications', description: 'Text message alerts', icon: MessageSquare },
  { id: 'calls', label: 'Call Notifications', description: 'Alerts for incoming calls', icon: Phone },
  { id: 'appointments', label: 'Appointment Reminders', description: 'Reminders before appointments', icon: Calendar },
];

// Sensible defaults: most channels on, SMS off (avoids surprise costs).
const DEFAULT_PREFS: Record<PrefKey, boolean> = {
  email: true,
  push: true,
  sms: false,
  calls: true,
  appointments: true,
};

export default function NotificationSettings() {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  // Load saved preferences from outreach_settings.notifications JSONB blob
  useEffect(() => {
    const saved = (tenantConfig?.outreach_settings as Record<string, unknown> | null | undefined)?.notifications as
      | Partial<Record<PrefKey, boolean>>
      | undefined;
    if (saved && typeof saved === 'object') {
      setPrefs((prev) => ({ ...DEFAULT_PREFS, ...prev, ...saved }));
    }
  }, [tenantConfig]);

  const togglePref = (key: PrefKey, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!tenantId) {
      toast({ title: 'Error', description: 'No tenant context — please refresh and try again.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const existing = (tenantConfig?.outreach_settings as Record<string, unknown> | null | undefined) || {};
      const merged = { ...existing, notifications: prefs };

      const { error } = await supabase
        .from('tenant_config')
        .update({
          outreach_settings: merged,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await refreshConfig();
      toast({ title: 'Preferences saved', description: 'Your notification settings have been updated.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save preferences';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <type.icon className="h-5 w-5" />
                </div>
                <div>
                  <Label htmlFor={`pref-${type.id}`}>{type.label}</Label>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
              <Switch
                id={`pref-${type.id}`}
                checked={prefs[type.id] ?? DEFAULT_PREFS[type.id]}
                onCheckedChange={(v) => togglePref(type.id, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground max-w-md">
          These preferences will be honored by automation workflows that send messages on your behalf.
        </p>
        <Button onClick={handleSave} disabled={saving || !tenantId}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
