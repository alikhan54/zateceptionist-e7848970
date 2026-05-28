import { Mail, MessageSquare, Phone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReminderChannel } from "@/hooks/useAccountingReminders";

export interface ChannelOption {
  code: ReminderChannel;
  label: string;
  icon: typeof Mail;
  configured: boolean;
}

export const DEFAULT_CHANNEL_OPTIONS: ChannelOption[] = [
  { code: "email", label: "Email", icon: Mail, configured: true },
  { code: "whatsapp", label: "WhatsApp", icon: MessageSquare, configured: false },
  { code: "sms", label: "SMS", icon: Phone, configured: false },
];

interface ChannelSelectorProps {
  value: ReminderChannel;
  onChange: (v: ReminderChannel) => void;
  options?: ChannelOption[];
  size?: "sm" | "md";
  className?: string;
  "data-testid"?: string;
}

export function ChannelSelector({
  value,
  onChange,
  options = DEFAULT_CHANNEL_OPTIONS,
  size = "md",
  className,
  "data-testid": testId,
}: ChannelSelectorProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-md border bg-muted/40 p-1", className)}
      data-testid={testId ?? "channel-selector"}
      role="radiogroup"
      aria-label="Reminder channel"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`channel-option-${opt.code}`}
            onClick={() => onChange(opt.code)}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors",
              size === "sm" ? "px-2 py-1 text-xs" : "",
              selected
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40",
            )}
          >
            <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
            <span>{opt.label}</span>
            {!opt.configured && (
              <span
                title={`${opt.label} channel not configured for this tenant — message will fail to send. Contact admin to provision.`}
                aria-label="not configured"
              >
                <AlertCircle className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", "text-amber-500 ml-0.5")} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
