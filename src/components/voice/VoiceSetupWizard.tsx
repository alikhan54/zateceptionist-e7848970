import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Info,
  BookOpen,
  X,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import {
  VOICE_COUNTRY_DATA,
  DEFAULT_VOICE_CONFIG,
  type CountryVoiceConfig,
  type ProviderOption,
} from "@/lib/voice-country-data";

const PRIORITY_COUNTRIES = ["US", "AE", "PK", "SA", "QA", "GB", "CA"] as const;

const statusIcon = (status: "yes" | "no" | "warn") => {
  if (status === "yes") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
};

function ProviderCard({
  provider,
  type,
}: {
  provider: ProviderOption;
  type: "recommended" | "alternative";
}) {
  return (
    <Card
      className={
        type === "recommended"
          ? "border-2 border-teal-500/60"
          : "border border-border"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{provider.provider}</CardTitle>
          <Badge
            variant={type === "recommended" ? "default" : "secondary"}
            className={
              type === "recommended"
                ? "bg-teal-500 text-white hover:bg-teal-600"
                : ""
            }
          >
            {type === "recommended" ? "Recommended" : "Alternative"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{provider.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {provider.capabilities.map((cap) => (
            <div
              key={cap.label}
              className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
            >
              <span className="text-muted-foreground">{cap.label}</span>
              <span className="flex items-center gap-1.5 font-medium">
                {statusIcon(cap.status)}
                {cap.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function VoiceSetupWizard() {
  const { tenantConfig } = useTenant();
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [otherCountry, setOtherCountry] = useState("");
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("voice-setup-wizard-dismissed") === "true"
  );
  const [collapsed, setCollapsed] = useState(false);

  // Hide if already configured or dismissed
  const isConfigured =
    !!tenantConfig?.vapi_assistant_id && !!tenantConfig?.vapi_phone_number;
  if (dismissed || isConfigured) {
    if (dismissed || isConfigured) {
      return collapsed || dismissed ? (
        <button
          onClick={() => {
            setDismissed(false);
            setCollapsed(false);
            localStorage.removeItem("voice-setup-wizard-dismissed");
          }}
          className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Setup guide
        </button>
      ) : null;
    }
  }

  const dismiss = () => {
    localStorage.setItem("voice-setup-wizard-dismissed", "true");
    setDismissed(true);
  };

  const getConfig = (): CountryVoiceConfig => {
    if (!selectedCountry) return DEFAULT_VOICE_CONFIG;
    return VOICE_COUNTRY_DATA[selectedCountry] || DEFAULT_VOICE_CONFIG;
  };

  const config = getConfig();

  return (
    <Card className="border-2 border-teal-500/30 bg-gradient-to-br from-teal-50/30 to-background mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-teal-500/15 flex items-center justify-center">
              <span className="text-lg">📞</span>
            </div>
            <div>
              <CardTitle className="text-lg">Voice Setup Wizard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Get your AI phone number configured in minutes
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 pt-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`h-2 rounded-full flex-1 transition-colors ${
                  s <= step ? "bg-teal-500" : "bg-muted"
                }`}
              />
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            Step {step}/3
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Step 1: Country Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Where will you be making and receiving calls?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRIORITY_COUNTRIES.map((code) => {
                const c = VOICE_COUNTRY_DATA[code];
                return (
                  <button
                    key={code}
                    onClick={() => {
                      setSelectedCountry(code);
                      setOtherCountry("");
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-sm ${
                      selectedCountry === code
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
                        : "border-border hover:border-teal-300"
                    }`}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <p className="text-sm font-medium mt-1">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.code}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Input
                placeholder="Other country name..."
                value={otherCountry}
                onChange={(e) => {
                  setOtherCountry(e.target.value);
                  setSelectedCountry("OTHER");
                }}
                className="max-w-xs"
              />
              {otherCountry && (
                <span className="text-xs text-muted-foreground">
                  We'll show generic setup recommendations
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Provider Recommendation */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Recommended setup for{" "}
              <span className="text-teal-600">
                {config.flag} {config.name}
              </span>
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <ProviderCard
                provider={config.recommended}
                type="recommended"
              />
              {config.alternative && (
                <ProviderCard
                  provider={config.alternative}
                  type="alternative"
                />
              )}
            </div>

            {config.warning && (
              <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {config.warning}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Setup Steps */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Setup steps for{" "}
              <span className="text-teal-600">
                {config.flag} {config.name}
              </span>{" "}
              with {config.recommended.provider}
            </p>

            <div className="space-y-3">
              {config.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm">{s}</p>
                </div>
              ))}
            </div>

            {config.warning && (
              <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {config.warning}
                </p>
              </div>
            )}

            <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                After setup, your AI assistant will automatically use this
                number for all voice interactions.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !selectedCountry}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={dismiss}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Done
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
