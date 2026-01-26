import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ExternalLink, 
  Loader2, 
  TestTube, 
  Save,
  Webhook,
  BookOpen,
  Settings2,
  Key,
  Sparkles,
} from 'lucide-react';
import { Integration, IntegrationSetting, IntegrationCredentialField } from '@/types/integrations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IntegrationDialogProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentials: Record<string, string>, settings?: Record<string, any>) => Promise<void>;
  onTest?: () => Promise<void>;
  storedCredentials?: Record<string, string>;
  storedSettings?: Record<string, any>;
  webhookUrl?: string;
  isConnected?: boolean;
  isSaving?: boolean;
  isTesting?: boolean;
}

export function IntegrationDialog({
  integration,
  isOpen,
  onClose,
  onSave,
  onTest,
  storedCredentials = {},
  storedSettings = {},
  webhookUrl,
  isConnected = false,
  isSaving = false,
  isTesting = false,
}: IntegrationDialogProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize values when integration changes
  useEffect(() => {
    if (integration) {
      // Set credentials from stored values
      const initialCreds: Record<string, string> = {};
      integration.credentials.forEach(field => {
        initialCreds[field.key] = storedCredentials[field.key] || '';
      });
      setCredentials(initialCreds);

      // Set settings from stored values or defaults
      const initialSettings: Record<string, any> = {};
      integration.settings?.forEach(setting => {
        initialSettings[setting.key] = storedSettings[setting.key] ?? setting.defaultValue;
      });
      setSettings(initialSettings);
    }
  }, [integration, storedCredentials, storedSettings]);

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    // Validate required fields
    const missingFields = integration?.credentials
      .filter(field => field.required && !credentials[field.key])
      .map(field => field.label);

    if (missingFields && missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    await onSave(credentials, settings);
  };

  const renderCredentialField = (field: IntegrationCredentialField) => {
    const isPassword = field.type === 'password';
    const showPassword = showPasswords[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key} className="flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        
        {field.type === 'textarea' ? (
          <Textarea
            id={field.key}
            placeholder={field.placeholder}
            value={credentials[field.key] || ''}
            onChange={(e) => handleCredentialChange(field.key, e.target.value)}
            className="font-mono text-sm"
            rows={4}
          />
        ) : field.type === 'select' && field.options ? (
          <Select
            value={credentials[field.key] || ''}
            onValueChange={(value) => handleCredentialChange(field.key, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="relative">
            <Input
              id={field.key}
              type={isPassword && !showPassword ? 'password' : 'text'}
              placeholder={field.placeholder}
              value={credentials[field.key] || ''}
              onChange={(e) => handleCredentialChange(field.key, e.target.value)}
              className={cn(isPassword && 'font-mono pr-20')}
            />
            {isPassword && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => togglePasswordVisibility(field.key)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {credentials[field.key] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyToClipboard(credentials[field.key], field.key)}
                  >
                    {copied === field.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    );
  };

  const renderSettingField = (setting: IntegrationSetting) => {
    return (
      <div key={setting.key} className="space-y-2">
        <Label htmlFor={setting.key}>{setting.label}</Label>
        
        {setting.type === 'boolean' ? (
          <div className="flex items-center gap-2">
            <Switch
              id={setting.key}
              checked={settings[setting.key] || false}
              onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {settings[setting.key] ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        ) : setting.type === 'select' && setting.options ? (
          <Select
            value={settings[setting.key] || ''}
            onValueChange={(value) => handleSettingChange(setting.key, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {setting.options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : setting.type === 'color' ? (
          <div className="flex gap-2">
            <Input
              id={setting.key}
              type="color"
              value={settings[setting.key] || '#000000'}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={settings[setting.key] || ''}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="flex-1 font-mono"
              placeholder="#3B82F6"
            />
          </div>
        ) : setting.type === 'textarea' ? (
          <Textarea
            id={setting.key}
            value={settings[setting.key] || ''}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            rows={3}
          />
        ) : (
          <Input
            id={setting.key}
            type={setting.type === 'number' ? 'number' : 'text'}
            value={settings[setting.key] || ''}
            onChange={(e) => handleSettingChange(setting.key, setting.type === 'number' ? Number(e.target.value) : e.target.value)}
          />
        )}
        
        {setting.helpText && (
          <p className="text-xs text-muted-foreground">{setting.helpText}</p>
        )}
      </div>
    );
  };

  if (!integration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${integration.color}15` }}
            >
              <Key className="h-5 w-5" style={{ color: integration.color }} />
            </div>
            {isConnected ? 'Configure' : 'Connect'} {integration.name}
          </DialogTitle>
          <DialogDescription>
            {integration.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="credentials" className="flex-1 overflow-hidden">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="credentials" className="gap-1.5">
              <Key className="h-3.5 w-3.5" />
              Credentials
            </TabsTrigger>
            {integration.settings && integration.settings.length > 0 && (
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
            )}
            {integration.setupGuide && integration.setupGuide.length > 0 && (
              <TabsTrigger value="guide" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Guide
              </TabsTrigger>
            )}
          </TabsList>

          <div className="overflow-y-auto max-h-[50vh] mt-4 pr-2">
            <TabsContent value="credentials" className="mt-0 space-y-4">
              {integration.credentials.map(renderCredentialField)}
              
              {/* Webhook URL */}
              {webhookUrl && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhook URL
                    </Label>
                    <div className="relative">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="font-mono text-xs pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                      >
                        {copied === 'webhook' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this URL to receive webhooks from {integration.name}
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            {integration.settings && integration.settings.length > 0 && (
              <TabsContent value="settings" className="mt-0 space-y-4">
                {integration.settings.map(renderSettingField)}
              </TabsContent>
            )}

            {integration.setupGuide && integration.setupGuide.length > 0 && (
              <TabsContent value="guide" className="mt-0">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Setup Instructions</h4>
                  <ol className="space-y-3">
                    {integration.setupGuide.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Features */}
        <div className="mt-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Features
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {integration.features.map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {integration.docsUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Docs
                </a>
              </Button>
            )}
            {onTest && isConnected && (
              <Button variant="outline" size="sm" onClick={onTest} disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <TestTube className="h-3.5 w-3.5 mr-1" />
                )}
                Test
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isConnected ? 'Save Changes' : 'Connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
