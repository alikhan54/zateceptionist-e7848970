import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/contexts/TenantContext';
import { IndustryType } from '@/types';
import { useToast } from '@/hooks/use-toast';

const industries: { value: IndustryType; label: string }[] = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon & Beauty' },
  { value: 'general', label: 'General Business' },
];

export function TenantSettings() {
  const { tenantConfig, tenantId } = useTenant();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState(tenantConfig?.company_name || '');
  const [industry, setIndustry] = useState<IndustryType>(tenantConfig?.industry || 'general');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement save to Supabase
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: 'Settings saved',
      description: 'Your business settings have been updated.',
    });
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>
          Configure your business profile and industry settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input id="tenantId" value={tenantId} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            Your unique tenant identifier (cannot be changed)
          </p>
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
            Industry selection affects terminology used throughout the app
          </p>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
