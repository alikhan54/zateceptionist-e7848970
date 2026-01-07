import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type AIMode = 'autonomous' | 'assisted' | 'manual';

interface ModuleSettings {
  sales: boolean;
  marketing: boolean;
  hr: boolean;
  support: boolean;
}

export function AIControlCenter() {
  const { tenantConfig, tenantId } = useTenant();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Default to assisted mode
  const [mode, setMode] = useState<AIMode>('assisted');
  
  const [modules, setModules] = useState<ModuleSettings>({
    sales: true,
    marketing: true,
    hr: false,
    support: true,
  });

  // Load from tenant config
  useEffect(() => {
    if (tenantConfig) {
      const configMode = tenantConfig.ai_mode as AIMode;
      if (configMode) setMode(configMode);
      
      const configModules = tenantConfig.ai_modules_enabled;
      if (configModules && typeof configModules === 'object') {
        setModules(prev => ({ ...prev, ...configModules }));
      }
    }
  }, [tenantConfig]);

  const handleModeChange = async (newMode: AIMode) => {
    setMode(newMode);
    
    if (tenantId) {
      const { error } = await supabase
        .from('tenant_config')
        .update({ ai_mode: newMode })
        .eq('tenant_id', tenantId);
      
      if (error) {
        toast({ title: 'Error', description: 'Failed to update AI mode', variant: 'destructive' });
      } else {
        toast({ title: 'AI Mode Updated', description: `Switched to ${newMode} mode` });
      }
    }
  };

  const toggleModule = async (module: keyof ModuleSettings) => {
    const newModules = { ...modules, [module]: !modules[module] };
    setModules(newModules);
    
    if (tenantId) {
      await supabase
        .from('tenant_config')
        .update({ ai_modules_enabled: newModules })
        .eq('tenant_id', tenantId);
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'autonomous':
        return 'text-green-500';
      case 'assisted':
        return 'text-blue-500';
      case 'manual':
        return 'text-muted-foreground';
    }
  };
  
  const getModeLabel = () => {
    switch (mode) {
      case 'autonomous': return 'Autonomous';
      case 'assisted': return 'Assisted';
      case 'manual': return 'Manual';
    }
  };

  const getModeColorClass = () => {
    switch (mode) {
      case 'autonomous': return 'bg-green-500';
      case 'assisted': return 'bg-blue-500';
      case 'manual': return 'bg-gray-500';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <div className="relative">
            <Bot className={cn(
              "h-4 w-4 transition-colors",
              getModeColor(),
              mode === 'autonomous' && "animate-pulse"
            )} />
            <span className={cn(
              "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
              getModeColorClass()
            )} />
          </div>
          <span className="hidden sm:inline">AI: {getModeLabel()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Control Center
              </h4>
              <p className="text-xs text-muted-foreground">Control how AI handles tasks</p>
            </div>
            <Badge variant="outline" className={cn(
              "text-xs",
              mode === 'autonomous' && "border-green-500 text-green-500",
              mode === 'assisted' && "border-blue-500 text-blue-500",
              mode === 'manual' && "border-muted-foreground text-muted-foreground"
            )}>
              {getModeLabel()}
            </Badge>
          </div>
          
          <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as AIMode)} className="space-y-3">
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="autonomous" id="autonomous" className="mt-1" />
              <Label htmlFor="autonomous" className="flex-1 cursor-pointer">
                <span className="font-medium text-green-600">Autonomous</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI handles everything automatically
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="assisted" id="assisted" className="mt-1" />
              <Label htmlFor="assisted" className="flex-1 cursor-pointer">
                <span className="font-medium text-blue-600">Assisted</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI suggests, you approve
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="manual" id="manual" className="mt-1" />
              <Label htmlFor="manual" className="flex-1 cursor-pointer">
                <span className="font-medium">Manual</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI disabled, you control everything
                </p>
              </Label>
            </div>
          </RadioGroup>
          
          <Separator />
          
          <div className="space-y-3">
            <h5 className="text-sm font-medium">Per-Module Controls</h5>
            {(['sales', 'marketing', 'hr', 'support'] as const).map((module) => (
              <div key={module} className="flex items-center justify-between">
                <span className="text-sm capitalize">{module} AI</span>
                <Switch 
                  checked={modules[module]} 
                  onCheckedChange={() => toggleModule(module)}
                  disabled={mode === 'manual'}
                />
              </div>
            ))}
          </div>

          {mode === 'manual' && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Per-module controls disabled in manual mode
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
