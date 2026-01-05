import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Building2, Globe, Palette } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

export default function GeneralSettings() {
  const { tenantConfig } = useTenant();

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
              <Input defaultValue={tenantConfig?.company_name || ''} placeholder="Your company name" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input defaultValue={tenantConfig?.industry || ''} placeholder="Your industry" />
            </div>
          </div>
          <Button>Save Changes</Button>
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
              <Input defaultValue="English" />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input defaultValue="UTC" />
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
              <Input defaultValue={tenantConfig?.primary_color || '#7c3aed'} className="w-32" />
              <div 
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: tenantConfig?.primary_color || '#7c3aed' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
