import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe, Palette, Loader2 } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { INDUSTRIES, TIMEZONES } from '@/pages/onboarding/constants';

export default function GeneralSettings() {
  const { tenantConfig, tenantId, refreshConfig } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('general');
  const [timezone, setTimezone] = useState('America/New_York');
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');

  useEffect(() => {
    if (tenantConfig) {
      setCompanyName(tenantConfig.company_name || '');
      setIndustry(tenantConfig.industry || 'general');
      setTimezone(tenantConfig.timezone || 'America/New_York');
      setPrimaryColor(tenantConfig.primary_color || '#7c3aed');
    }
  }, [tenantConfig]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_config')
        .update({
          company_name: companyName,
          industry,
          timezone,
          primary_color: primaryColor,
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await refreshConfig();
      toast({ title: 'Settings saved', description: 'Your changes have been applied.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>Basic company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.icon} {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localization
          </CardTitle>
          <CardDescription>Language and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Input defaultValue="English" disabled />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>Customize your workspace appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32"
              />
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
