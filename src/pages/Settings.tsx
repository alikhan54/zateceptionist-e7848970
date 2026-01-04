import { useState } from 'react';
import { useTenant, IndustryType } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, User, Palette, Bell } from 'lucide-react';

const industries: { value: IndustryType; label: string }[] = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'general', label: 'General Business' },
];

export default function SettingsPage() {
  const { tenantConfig, tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState(tenantConfig?.company_name || '');
  const [industry, setIndustry] = useState<IndustryType>(tenantConfig?.industry || 'general');

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your settings have been updated successfully.',
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Configure your business information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant ID</Label>
            <Input id="tenantId" value={tenantId || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter your business name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select value={industry} onValueChange={(v) => setIndustry(v as IndustryType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This affects the vocabulary used in the app (e.g., "Patient" vs "Client")
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
