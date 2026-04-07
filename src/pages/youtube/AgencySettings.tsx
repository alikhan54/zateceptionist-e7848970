import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Settings, Mail, Target, Sliders, FileText, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useYTAgencySettings, useUpdateYTAgencySettings } from "@/hooks/useYouTubeAgency";

const NICHE_OPTIONS = [
  "crypto", "trading", "real_estate", "automotive",
  "gaming", "fitness", "cooking", "beauty",
  "technology", "education", "entertainment", "music",
  "vlogs", "self_improvement", "comedy", "sports",
];

const COUNTRY_OPTIONS = [
  { code: "AE", name: "UAE" }, { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "IT", name: "Italy" }, { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" }, { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" }, { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" }, { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" }, { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" }, { code: "CZ", name: "Czechia" },
  { code: "HU", name: "Hungary" }, { code: "GR", name: "Greece" },
  { code: "RO", name: "Romania" }, { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" }, { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" }, { code: "EE", name: "Estonia" },
  { code: "LV", name: "Latvia" }, { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" }, { code: "MT", name: "Malta" },
  { code: "CY", name: "Cyprus" },
];

export default function AgencySettings() {
  const { data: settings, isLoading } = useYTAgencySettings();
  const updateSettings = useUpdateYTAgencySettings();

  // Local form state
  const [niches, setNiches] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [minSubs, setMinSubs] = useState(0);
  const [maxSubs, setMaxSubs] = useState(100000);
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);
  const [outreachEnabled, setOutreachEnabled] = useState(false);
  const [outreachLimit, setOutreachLimit] = useState(50);
  const [offerDescription, setOfferDescription] = useState("");
  const [outreachTemplate, setOutreachTemplate] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderSignature, setSenderSignature] = useState("");

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState<number | "">("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");

  // Sync from server data on load
  useEffect(() => {
    if (settings) {
      setNiches(settings.yt_target_niches || []);
      setCountries(settings.yt_target_countries || []);
      setMinSubs(settings.yt_min_subscribers || 0);
      setMaxSubs(settings.yt_max_subscribers || 100000);
      setDiscoveryEnabled(settings.yt_daily_discovery_enabled || false);
      setOutreachEnabled(settings.yt_daily_outreach_enabled || false);
      setOutreachLimit(settings.yt_daily_outreach_limit || 50);
      setOfferDescription(settings.yt_offer_description || "");
      setOutreachTemplate(settings.yt_outreach_template || "");
      setSenderName(settings.yt_sender_name || "");
      setSenderSignature(settings.yt_sender_signature || "");
      setSmtpHost(settings.smtp_host || "");
      setSmtpPort(settings.smtp_port || "");
      setSmtpUser(settings.smtp_user || "");
      setSmtpFromEmail(settings.smtp_from_email || "");
      setSmtpFromName(settings.smtp_from_name || "");
    }
  }, [settings]);

  const smtpConfigured = !!(smtpHost && smtpUser && smtpFromEmail);

  const toggleNiche = (n: string) => {
    setNiches((cur) => cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n]);
  };
  const toggleCountry = (c: string) => {
    setCountries((cur) => cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  };

  const handleSaveICP = () => {
    updateSettings.mutate({
      yt_target_niches: niches,
      yt_target_countries: countries,
      yt_min_subscribers: minSubs,
      yt_max_subscribers: maxSubs,
    });
  };

  const handleSaveSMTP = () => {
    updateSettings.mutate({
      smtp_host: smtpHost || null,
      smtp_port: typeof smtpPort === "number" ? smtpPort : null,
      smtp_user: smtpUser || null,
      smtp_from_email: smtpFromEmail || null,
      smtp_from_name: smtpFromName || null,
    });
  };

  const handleSaveTemplate = () => {
    updateSettings.mutate({
      yt_outreach_template: outreachTemplate || null,
      yt_sender_name: senderName || null,
      yt_sender_signature: senderSignature || null,
    });
  };

  const handleSaveAutomation = () => {
    updateSettings.mutate({
      yt_daily_discovery_enabled: discoveryEnabled,
      yt_daily_outreach_enabled: outreachEnabled && smtpConfigured, // SAFETY: gate on SMTP
      yt_daily_outreach_limit: outreachLimit,
    });
  };

  const handleSaveOffer = () => {
    updateSettings.mutate({
      yt_offer_description: offerDescription || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-purple-500" />
          YouTube Agency Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your discovery, outreach, and AI sales agent
        </p>
      </div>

      {/* SMTP Status Banner */}
      {!smtpConfigured && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">SMTP not configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Discovery is running, but outreach will not send until you configure your SMTP credentials below.
                Each tenant must use their own sending domain — there is no shared sending.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ICP Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Ideal Customer Profile
          </CardTitle>
          <CardDescription>
            Define which YouTube channels to discover and target
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Target Niches</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {NICHE_OPTIONS.map((n) => (
                <Badge
                  key={n}
                  variant={niches.includes(n) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleNiche(n)}
                >
                  {n}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{niches.length} selected</p>
          </div>

          <div>
            <Label className="text-sm font-medium">Target Countries</Label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto">
              {COUNTRY_OPTIONS.map((c) => (
                <Badge
                  key={c.code}
                  variant={countries.includes(c.code) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCountry(c.code)}
                >
                  {c.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{countries.length} selected</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-subs">Min Subscribers</Label>
              <Input
                id="min-subs"
                type="number"
                value={minSubs}
                onChange={(e) => setMinSubs(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="max-subs">Max Subscribers</Label>
              <Input
                id="max-subs"
                type="number"
                value={maxSubs}
                onChange={(e) => setMaxSubs(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <Button onClick={handleSaveICP} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save ICP Configuration
          </Button>
        </CardContent>
      </Card>

      {/* SMTP Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-500" />
            Email Sender Setup
            {smtpConfigured ? (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
              </Badge>
            ) : (
              <Badge variant="outline">Not Configured</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Your own SMTP credentials. Outreach will not send until this is configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SMTP Host</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.yourdomain.com"
              />
            </div>
            <div>
              <Label>SMTP Port</Label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="587"
              />
            </div>
          </div>
          <div>
            <Label>SMTP Username</Label>
            <Input
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="you@yourdomain.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Email</Label>
              <Input
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder="hello@yourdomain.com"
              />
            </div>
            <div>
              <Label>From Name</Label>
              <Input
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="Your Name"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Password is set via secure environment variable. Contact admin to update.
          </p>
          <Button onClick={handleSaveSMTP} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save SMTP Settings
          </Button>
        </CardContent>
      </Card>

      {/* Outreach Template Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Outreach Template
          </CardTitle>
          <CardDescription>
            Variables available: {"{channel_name}"}, {"{niche}"}, {"{sub_count}"}, {"{recent_video_title}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sender Name</Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Youssef"
              />
            </div>
            <div>
              <Label>Sender Signature</Label>
              <Input
                value={senderSignature}
                onChange={(e) => setSenderSignature(e.target.value)}
                placeholder="Founder, YouTube Agency"
              />
            </div>
          </div>
          <div>
            <Label>Email Template</Label>
            <Textarea
              value={outreachTemplate}
              onChange={(e) => setOutreachTemplate(e.target.value)}
              placeholder={"Hey {channel_name},\n\nLove your work in the {niche} space..."}
              rows={10}
            />
          </div>
          <Button onClick={handleSaveTemplate} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </CardContent>
      </Card>

      {/* Automation Toggles Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-orange-500" />
            Automation
          </CardTitle>
          <CardDescription>
            Control daily discovery and outreach automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Daily Discovery</Label>
              <p className="text-sm text-muted-foreground">
                Automatically discover new channels every morning
              </p>
            </div>
            <Switch checked={discoveryEnabled} onCheckedChange={setDiscoveryEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Daily Outreach</Label>
              <p className="text-sm text-muted-foreground">
                {smtpConfigured
                  ? "Send personalized outreach emails daily"
                  : "Disabled until SMTP is configured"}
              </p>
            </div>
            <Switch
              checked={outreachEnabled && smtpConfigured}
              onCheckedChange={setOutreachEnabled}
              disabled={!smtpConfigured}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Daily Outreach Limit</Label>
              <span className="text-sm font-mono">{outreachLimit}</span>
            </div>
            <Slider
              value={[outreachLimit]}
              onValueChange={(v) => setOutreachLimit(v[0])}
              min={10}
              max={200}
              step={10}
              disabled={!smtpConfigured}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum emails to send per day (10-200)
            </p>
          </div>

          <Button onClick={handleSaveAutomation} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Automation Settings
          </Button>
        </CardContent>
      </Card>

      {/* Offer Description Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-pink-500" />
            Service Offer
          </CardTitle>
          <CardDescription>
            Your service description (used by AI sales agent)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Offer Description</Label>
            <Textarea
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              placeholder="Describe your service in detail. The AI uses this to qualify and close leads."
              rows={5}
            />
          </div>
          <Button onClick={handleSaveOffer} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Offer Description
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
