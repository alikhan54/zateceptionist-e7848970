import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Plug, 
  PlugZap, 
  X,
  Crown,
  Sparkles,
  Clock,
  Activity,
  MessageCircle,
  Calendar,
  CreditCard,
  Users,
  Headphones,
  ShoppingCart,
  Brain,
  Zap,
  BarChart3,
  FileText,
  Instagram,
  Facebook,
  Send,
  Mail,
  Phone,
  Hash,
  Search,
  Cloud,
  Target,
  Database,
  Briefcase,
  Globe,
  Music,
  CalendarDays,
  CalendarCheck,
  DollarSign,
  ShoppingBag,
  Building,
  LifeBuoy,
  LineChart,
  PieChart,
  Share2,
  FileInput,
  ClipboardList,
  Linkedin,
  MessageSquare,
  Twitter,
} from 'lucide-react';
import { Integration, IntegrationStatus, IntegrationHealth, INTEGRATION_CATEGORIES } from '@/types/integrations';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
  integration: Integration & { 
    status: IntegrationStatus; 
    health?: IntegrationHealth;
    connectedAt?: string;
    lastSyncAt?: string;
  };
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Calendar,
  CreditCard,
  Users,
  Headphones,
  ShoppingCart,
  Brain,
  Zap,
  BarChart3,
  FileText,
  Instagram,
  Facebook,
  Send,
  Mail,
  Phone,
  Hash,
  Search,
  Cloud,
  Target,
  Database,
  Briefcase,
  Globe,
  Music,
  CalendarDays,
  CalendarCheck,
  DollarSign,
  ShoppingBag,
  Building,
  LifeBuoy,
  LineChart,
  PieChart,
  Share2,
  FileInput,
  ClipboardList,
  Linkedin,
  MessageSquare,
  Twitter,
  Sparkles,
  Activity,
  Sheet: FileText,
};

export function IntegrationCard({ 
  integration, 
  onConnect, 
  onDisconnect, 
  onConfigure 
}: IntegrationCardProps) {
  const IconComponent = ICON_MAP[integration.icon] || Plug;
  const isConnected = integration.status === 'connected';
  const isComingSoon = integration.comingSoon;
  const category = INTEGRATION_CATEGORIES[integration.category];

  const getTierBadge = () => {
    switch (integration.tier) {
      case 'professional':
        return (
          <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
            Pro
          </Badge>
        );
      case 'enterprise':
        return (
          <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
            <Crown className="h-3 w-3 mr-1" />
            Enterprise
          </Badge>
        );
      default:
        return null;
    }
  };

  const getHealthBadge = () => {
    if (!integration.health) return null;
    
    const colors = {
      healthy: 'bg-green-500/10 text-green-600',
      degraded: 'bg-yellow-500/10 text-yellow-600',
      down: 'bg-red-500/10 text-red-600',
    };

    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge className={cn('text-xs', colors[integration.health.status])}>
            <Activity className="h-3 w-3 mr-1" />
            {integration.health.status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Last checked: {new Date(integration.health.lastCheck).toLocaleString()}
          {integration.health.latency && ` (${integration.health.latency}ms)`}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className={cn(
        'relative overflow-hidden transition-all duration-200 group',
        isConnected && 'ring-1 ring-green-500/30',
        isComingSoon && 'opacity-60'
      )}>
        {/* Status bar */}
        {isConnected && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
        )}

        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div 
              className="p-2.5 rounded-xl transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${integration.color}15` }}
            >
              <IconComponent 
                className="h-6 w-6" 
                style={{ color: integration.color }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {integration.popular && !isComingSoon && (
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Popular
                </Badge>
              )}
              {getTierBadge()}
              {isComingSoon && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Soon
                </Badge>
              )}
            </div>
          </div>

          {/* Name and Description */}
          <h3 className="font-semibold text-foreground mb-1">{integration.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {integration.description}
          </p>

          {/* Status & Health */}
          <div className="flex items-center gap-2 mb-4">
            {isConnected ? (
              <>
                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                {getHealthBadge()}
              </>
            ) : (
              <Badge variant="secondary">
                <PlugZap className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>

          {/* Last Sync */}
          {integration.lastSyncAt && (
            <p className="text-xs text-muted-foreground mb-3">
              Last synced: {new Date(integration.lastSyncAt).toLocaleDateString()}
            </p>
          )}

          {/* Features Preview (on hover) */}
          <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-200">
            <div className="flex flex-wrap gap-1 mb-3">
              {integration.features.slice(0, 3).map((feature, idx) => (
                <span 
                  key={idx} 
                  className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                >
                  {feature}
                </span>
              ))}
              {integration.features.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                  +{integration.features.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isComingSoon ? (
              <Button variant="outline" size="sm" className="flex-1" disabled>
                Coming Soon
              </Button>
            ) : isConnected ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={onConfigure}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Configure
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={onDisconnect}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Disconnect</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={onConnect}
              >
                <Plug className="h-3 w-3 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
