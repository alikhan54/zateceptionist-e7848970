import React, { useState, useCallback } from "react";
import { useTenant, TenantConfig } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Phone,
  Twitter,
  Linkedin,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ChannelField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password" | "number";
}

interface ChannelConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  enabledKey: keyof TenantConfig;
  fields: ChannelField[];
  description: string;
}

// ============================================================================
// CHANNEL CONFIGURATIONS
// ============================================================================

const CHANNELS: ChannelConfig[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    enabledKey: "has_whatsapp",
    description: "Connect via Meta Business or WATI",
    fields: [
      { key: "meta_page_token", label: "Meta Page Token", placeholder: "EAAxxxxxxxx...", type: "password" },
      { key: "wati_api_key", label: "WATI API Key (optional)", placeholder: "wati_xxxxxxxx", type: "password" },
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    enabledKey: "has_instagram",
    description: "Connect your Instagram Business account",
    fields: [
      { key: "instagram_page_id", label: "Instagram Page ID", placeholder: "17841400xxxxx", type: "text" },
      { key: "meta_page_token", label: "Meta Page Token", placeholder: "EAAxxxxxxxx...", type: "password" },
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    enabledKey: "has_facebook",
    description: "Connect your Facebook Page",
    fields: [
      { key: "meta_page_id", label: "Facebook Page ID", placeholder: "123456789xxxxx", type: "text" },
      { key: "meta_page_token", label: "Meta Page Token", placeholder: "EAAxxxxxxxx...", type: "password" },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: Send,
    enabledKey: "has_telegram" as keyof TenantConfig,
    description: "Connect your Telegram Bot",
    fields: [
      { key: "telegram_bot_token", label: "Bot Token", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", type: "password" },
    ],
  },
  {
    id: "sms",
    name: "SMS (Twilio)",
    icon: Phone,
    enabledKey: "has_sms" as keyof TenantConfig,
    description: "Send and receive SMS via Twilio",
    fields: [
      { key: "twilio_account_sid", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", type: "text" },
      { key: "twilio_auth_token", label: "Auth Token", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", type: "password" },
      { key: "twilio_phone_number", label: "Phone Number", placeholder: "+1234567890", type: "text" },
    ],
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: Twitter,
    enabledKey: "has_twitter" as keyof TenantConfig,
    description: "Connect your Twitter/X account",
    fields: [
      { key: "twitter_bearer_token", label: "Bearer Token", placeholder: "AAAAAAAAAAAAAAAAAAAAAxxxxxx...", type: "password" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    enabledKey: "has_linkedin",
    description: "Connect your LinkedIn Company Page",
    fields: [
      { key: "linkedin_access_token", label: "Access Token", placeholder: "AQVxxxxxxxxx...", type: "password" },
    ],
  },
  {
    id: "email",
    name: "Email (SMTP)",
    icon: Mail,
    enabledKey: "has_email",
    description: "Configure SMTP for email sending",
    fields: [
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.example.com", type: "text" },
      { key: "smtp_port", label: "SMTP Port", placeholder: "587", type: "number" },
      { key: "smtp_user", label: "SMTP Username", placeholder: "user@example.com", type: "text" },
      { key: "smtp_pass", label: "SMTP Password", placeholder: "••••••••", type: "password" },
      { key: "smtp_from_email", label: "From Email", placeholder: "noreply@yourbusiness.com", type: "text" },
      { key: "smtp_from_name", label: "From Name", placeholder: "Your Business Name", type: "text" },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ChannelSettings() {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const { toast } = useToast();
  
  const [configuring, setConfiguring] = useState<ChannelConfig | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleConfigure = useCallback((channel: ChannelConfig) => {
    // Pre-fill with existing values if available
    const initialValues: Record<string, string> = {};
    channel.fields.forEach((field) => {
      const config = tenantConfig as unknown as Record<string, unknown> | null;
      const existingValue = config?.[field.key];
      if (typeof existingValue === "string" || typeof existingValue === "number") {
        initialValues[field.key] = String(existingValue);
      } else {
        initialValues[field.key] = "";
      }
    });
    setConfigValues(initialValues);
    setShowPasswords({});
    setTestResult(null);
    setConfiguring(channel);
  }, [tenantConfig]);

  const handleClose = useCallback(() => {
    setConfiguring(null);
    setConfigValues({});
    setShowPasswords({});
    setTestResult(null);
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!configuring) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Simulate connection test - in production, call a webhook/edge function
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if required fields are filled
      const hasRequiredFields = configuring.fields.every(
        (field) => configValues[field.key]?.trim()
      );

      if (hasRequiredFields) {
        setTestResult({ success: true, message: "Connection successful!" });
      } else {
        setTestResult({ success: false, message: "Please fill all required fields." });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Connection failed" 
      });
    } finally {
      setTesting(false);
    }
  }, [configuring, configValues]);

  const handleSave = useCallback(async () => {
    if (!tenantId || !configuring) return;

    setSaving(true);
    try {
      // Build update object with channel config and enabled flag
      const updateData: Record<string, unknown> = {
        [configuring.enabledKey]: true,
      };
      
      configuring.fields.forEach((field) => {
        const value = configValues[field.key]?.trim();
        if (value) {
          updateData[field.key] = field.type === "number" ? parseInt(value, 10) : value;
        }
      });

      const { error } = await supabase
        .from("tenant_config")
        .update(updateData)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      await refreshConfig();
      
      toast({
        title: "Channel configured",
        description: `${configuring.name} has been configured successfully.`,
      });

      handleClose();
    } catch (error) {
      console.error("Error saving channel config:", error);
      toast({
        title: "Error",
        description: "Failed to save channel configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [tenantId, configuring, configValues, refreshConfig, toast, handleClose]);

  const handleDisable = useCallback(async (channel: ChannelConfig) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from("tenant_config")
        .update({ [channel.enabledKey]: false })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      await refreshConfig();
      
      toast({
        title: "Channel disabled",
        description: `${channel.name} has been disabled.`,
      });
    } catch (error) {
      console.error("Error disabling channel:", error);
      toast({
        title: "Error",
        description: "Failed to disable channel.",
        variant: "destructive",
      });
    }
  }, [tenantId, refreshConfig, toast]);

  const togglePasswordVisibility = useCallback((fieldKey: string) => {
    setShowPasswords((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  }, []);

  const isChannelEnabled = useCallback((channel: ChannelConfig): boolean => {
    const config = tenantConfig as unknown as Record<string, unknown> | null;
    return Boolean(config?.[channel.enabledKey]);
  }, [tenantConfig]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Communication Channels</h3>
        <p className="text-sm text-muted-foreground">
          Configure your communication channels to connect with customers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const enabled = isChannelEnabled(channel);

          return (
            <Card key={channel.id} className={enabled ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                      <Badge variant={enabled ? "default" : "secondary"} className="mt-1">
                        {enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-xs">
                  {channel.description}
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    variant={enabled ? "outline" : "default"}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleConfigure(channel)}
                  >
                    Configure
                  </Button>
                  {enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisable(channel)}
                    >
                      Disable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={!!configuring} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configuring && <configuring.icon className="h-5 w-5" />}
              Configure {configuring?.name}
            </DialogTitle>
            <DialogDescription>
              {configuring?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {configuring?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="relative">
                  <Input
                    id={field.key}
                    type={
                      field.type === "password" && !showPasswords[field.key]
                        ? "password"
                        : field.type === "number"
                        ? "number"
                        : "text"
                    }
                    placeholder={field.placeholder}
                    value={configValues[field.key] || ""}
                    onChange={(e) =>
                      setConfigValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className={field.type === "password" ? "pr-10" : ""}
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => togglePasswordVisibility(field.key)}
                    >
                      {showPasswords[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Test Result */}
            {testResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  testResult.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="w-full sm:w-auto"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || testing}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChannelSettings;
