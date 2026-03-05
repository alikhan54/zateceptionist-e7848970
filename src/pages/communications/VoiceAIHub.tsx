import React from "react";
import { useSearchParams } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3, Settings2, Phone, List, Headphones, GitBranch } from "lucide-react";

import VoiceOverview from "./voice-ai/VoiceOverview";
import VoiceAIConfig from "./voice-ai/VoiceAIConfig";
import VoicePhoneNumbers from "./voice-ai/VoicePhoneNumbers";
import VoiceCallLog from "./voice-ai/VoiceCallLog";
import VoiceCallCenter from "./voice-ai/VoiceCallCenter";
import VoiceIVRBuilder from "./voice-ai/VoiceIVRBuilder";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "config", label: "AI Config", icon: Settings2 },
  { key: "phones", label: "Phone Numbers", icon: Phone },
  { key: "calls", label: "Call Log", icon: List },
  { key: "center", label: "Call Center", icon: Headphones },
  { key: "ivr", label: "IVR Builder", icon: GitBranch },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function VoiceAIHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantConfig } = useTenant();

  const activeTab = (searchParams.get("tab") as TabKey) || "overview";

  const vapiConfigured =
    !!tenantConfig?.vapi_api_key &&
    !!tenantConfig?.vapi_assistant_id;

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <VoiceOverview />;
      case "config":
        return <VoiceAIConfig />;
      case "phones":
        return <VoicePhoneNumbers />;
      case "calls":
        return <VoiceCallLog />;
      case "center":
        return <VoiceCallCenter />;
      case "ivr":
        return <VoiceIVRBuilder />;
      default:
        return <VoiceOverview />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice AI</h1>
          <p className="text-muted-foreground">
            AI-powered voice communications hub
          </p>
        </div>
        <Badge
          className={
            vapiConfigured
              ? "bg-green-500 text-white"
              : "bg-amber-500 text-white"
          }
        >
          <Activity className="h-3 w-3 mr-1" />
          {vapiConfigured ? "VAPI Connected" : "Setup Required"}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
}
