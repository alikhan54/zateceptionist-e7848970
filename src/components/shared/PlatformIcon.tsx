import { cn } from "@/lib/utils";
import { 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Mail, 
  Phone, 
  Globe,
  MessageSquare,
  Video,
  Send,
  type LucideIcon
} from "lucide-react";

type Platform = "whatsapp" | "instagram" | "facebook" | "email" | "voice" | "sms" | "web" | "telegram" | "video";

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  showBackground?: boolean;
  className?: string;
}

interface PlatformConfig {
  icon: LucideIcon;
  label: string;
  bgClassName: string;
  iconClassName: string;
}

const platformConfig: Record<Platform, PlatformConfig> = {
  whatsapp: {
    icon: MessageCircle,
    label: "WhatsApp",
    bgClassName: "bg-green-500/15",
    iconClassName: "text-green-600",
  },
  instagram: {
    icon: Instagram,
    label: "Instagram",
    bgClassName: "bg-pink-500/15",
    iconClassName: "text-pink-600",
  },
  facebook: {
    icon: Facebook,
    label: "Facebook",
    bgClassName: "bg-blue-600/15",
    iconClassName: "text-blue-600",
  },
  email: {
    icon: Mail,
    label: "Email",
    bgClassName: "bg-amber-500/15",
    iconClassName: "text-amber-600",
  },
  voice: {
    icon: Phone,
    label: "Voice",
    bgClassName: "bg-violet-500/15",
    iconClassName: "text-violet-600",
  },
  sms: {
    icon: MessageSquare,
    label: "SMS",
    bgClassName: "bg-cyan-500/15",
    iconClassName: "text-cyan-600",
  },
  web: {
    icon: Globe,
    label: "Web",
    bgClassName: "bg-slate-500/15",
    iconClassName: "text-slate-600",
  },
  telegram: {
    icon: Send,
    label: "Telegram",
    bgClassName: "bg-sky-500/15",
    iconClassName: "text-sky-600",
  },
  video: {
    icon: Video,
    label: "Video",
    bgClassName: "bg-red-500/15",
    iconClassName: "text-red-600",
  },
};

export function PlatformIcon({ platform, size = 16, showBackground = false, className }: PlatformIconProps) {
  const config = platformConfig[platform] || platformConfig.web;
  const Icon = config.icon;

  if (showBackground) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-md p-1.5",
          config.bgClassName,
          className
        )}
      >
        <Icon size={size} className={config.iconClassName} />
      </div>
    );
  }

  return <Icon size={size} className={cn(config.iconClassName, className)} />;
}

export function getPlatformLabel(platform: Platform): string {
  return platformConfig[platform]?.label || platform;
}
