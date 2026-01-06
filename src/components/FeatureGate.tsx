import { useNavigate } from 'react-router-dom';
import { useSubscription, type FeatureAccess } from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof FeatureAccess;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const navigate = useNavigate();
  const { canAccess, getRequiredPlan, getPlanDisplayName } = useSubscription();
  
  if (canAccess(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  const requiredPlan = getRequiredPlan(feature);
  
  // Default upgrade prompt
  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          This feature requires a {getPlanDisplayName(requiredPlan)} plan or higher.
        </p>
        <Button onClick={() => navigate('/settings/billing')} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}

// Simpler lock icon for nav items
interface FeatureLockBadgeProps {
  feature: keyof FeatureAccess;
}

export function FeatureLockBadge({ feature }: FeatureLockBadgeProps) {
  const { requiresUpgrade } = useSubscription();
  
  if (!requiresUpgrade(feature)) {
    return null;
  }
  
  return (
    <Lock className="h-3 w-3 text-muted-foreground" />
  );
}
